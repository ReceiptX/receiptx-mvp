// @ts-nocheck
import { NextResponse } from 'next/server';
import { MultiTenantWalletGenerator } from '@/lib/multiTenantWalletGenerator';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimiter';
import { supabase } from '@/lib/supabaseClient';
import { sendSecurityEmail } from '@/lib/emailService';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const RECEIPTX_TENANT_CONFIG = {
  tenant_id: process.env.RECEIPTX_TENANT_ID || "receiptx_main",
  tenant_salt: process.env.RECEIPTX_TENANT_SALT || process.env.WEB2WEB3_SECRET_KEY || "",
  tenant_pepper: process.env.RECEIPTX_TENANT_PEPPER || process.env.WEB2WEB3_PEPPER || "",
  wallet_policy: "custodial" as const
};

export async function POST(req: Request) {
  let status = 'success';
  let error_message = null;
  let wallet = null;
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
    const rateId = `recover:${ip}:${email}`;
    const rate = checkRateLimit(rateId, 5, 60 * 1000); // 5 requests/minute
    if (!rate.allowed) {
      status = 'failure';
      error_message = 'Too many requests, try again later.';
      if (email) {
        sendSecurityEmail({
          to: email,
          subject: 'Wallet Recovery Rate Limited',
          text: `Your wallet recovery was rate limited from IP ${ip}. If this wasn't you, please contact support.`
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
    const generator = new MultiTenantWalletGenerator();
    // Use userSecret as additional entropy for wallet derivation
    wallet = await generator.generateWalletForTenant({
      email,
      tenant_id: RECEIPTX_TENANT_CONFIG.tenant_id,
      userSecret
    }, RECEIPTX_TENANT_CONFIG, userSecret);
    if (email) {
      sendSecurityEmail({
        to: email,
        subject: 'Wallet Recovered',
        text: `Your wallet was recovered from IP ${ip}. If this wasn't you, please contact support immediately.`
      });
    }
    return NextResponse.json({ success: true, wallet: { address: wallet.address } });
  } catch (err: any) {
    status = 'failure';
    error_message = err?.message || 'Wallet recovery failed';
    if (email) {
      sendSecurityEmail({
        to: email,
        subject: 'Wallet Recovery Failed',
        text: `A wallet recovery was attempted for your account but failed. If this wasn't you, please contact support.`
      });
    }
    return NextResponse.json({ success: false, error: error_message }, { status: 500 });
  } finally {
    // Audit log insert (non-blocking)
    try {
      await supabase.from('audit_log').insert({
        user_email: email,
        action: 'wallet_recover',
        status,
        ip_address: ip,
        user_agent: userAgent,
        details: wallet ? { address: wallet.address } : {},
        error_message
      });
    } catch {}
  }
}

