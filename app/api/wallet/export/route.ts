import { NextResponse } from 'next/server';
// ...existing code...
import { sendSecurityEmail } from '@/lib/emailService';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimiter';
import { supabase } from '@/lib/supabaseClient';
export const dynamic = 'force-dynamic';

async function decryptPrivateKey(encrypted: string, userSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const encryptedBytes = Buffer.from(encrypted, 'base64');
  const iv = encryptedBytes.slice(0, 12);
  const data = encryptedBytes.slice(12);
  const keyData = encoder.encode(userSecret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest('SHA-256', keyData),
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  return new TextDecoder().decode(decrypted);
}

export async function POST(req: Request) {
  let status = 'success';
  let error_message = null;
  let privateKey = null;
  let email = '';
  let ip = '';
  let userAgent = '';
  try {
    const body = await req.json();
    email = body.email;
    const { password, twofa } = body;
    // Use IP + email for rate limiting
    ip = (typeof req.headers.get === 'function' ? req.headers.get('x-forwarded-for') : undefined) || 'unknown';
    userAgent = (typeof req.headers.get === 'function' ? req.headers.get('user-agent') : undefined) || '';
    const rateId = `export:${ip}:${email}`;
    const rate = checkRateLimit(rateId, 3, 60 * 1000); // 3 requests/minute
    if (!rate.allowed) {
      status = 'failure';
      error_message = 'Too many requests, try again later.';
      if (email) {
        sendSecurityEmail({
          to: email,
          subject: 'Wallet Export Rate Limited',
          text: `Your wallet export was rate limited from IP ${ip}. If this wasn't you, please contact support.`
        });
      }
      return new NextResponse(JSON.stringify({ success: false, error: error_message }), {
        status: 429,
        headers: getRateLimitHeaders(rate)
      });
    }
    if (!email) {
      status = 'failure';
      error_message = 'Email required';
      return NextResponse.json({ success: false, error: error_message }, { status: 400 });
    }
    if (!password && !twofa) {
      status = 'failure';
      error_message = 'Password or 2FA code required';
      return NextResponse.json({ success: false, error: error_message }, { status: 400 });
    }
    const userSecret = password || twofa;
    // Find wallet
    const { data, error } = await supabase
      .from('user_wallets')
      .select('encrypted_private_key')
      .eq('user_email', email)
      .maybeSingle();
    if (error || !data) {
      status = 'failure';
      error_message = 'Wallet not found';
      if (email) {
        sendSecurityEmail({
          to: email,
          subject: 'Wallet Export Attempt Failed',
          text: `A wallet export was attempted for your account but no wallet was found. If this wasn't you, please contact support.`
        });
      }
      return NextResponse.json({ success: false, error: error_message }, { status: 404 });
    }
    // Decrypt private key
    try {
      privateKey = await decryptPrivateKey(data.encrypted_private_key, userSecret);
    } catch {
      status = 'failure';
      error_message = 'Incorrect password or 2FA code';
      if (email) {
        sendSecurityEmail({
          to: email,
          subject: 'Wallet Export Failed',
          text: `A wallet export was attempted for your account but failed due to incorrect password or 2FA code. If this wasn't you, please contact support.`
        });
      }
      return NextResponse.json({ success: false, error: error_message }, { status: 401 });
    }
    if (email) {
      sendSecurityEmail({
        to: email,
        subject: 'Wallet Exported',
        text: `Your wallet private key was exported from IP ${ip}. If this wasn't you, please contact support immediately.`
      });
    }
    return NextResponse.json({ success: true, privateKey });
  } catch (err: unknown) {
    status = 'failure';
    error_message = 'Export failed';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      error_message = (err as { message: string }).message;
    }
    return NextResponse.json({ success: false, error: error_message }, { status: 500 });
  } finally {
    // Audit log insert (non-blocking)
    try {
      await supabase.from('audit_log').insert({
        user_email: email,
        action: 'wallet_export',
        status,
        ip_address: ip,
        user_agent: userAgent,
        details: privateKey ? { exported: true } : {},
        error_message
      });
    } catch {}
  }
}
