import { NextResponse } from 'next/server';
import * as otplib from 'otplib';
import { supabase } from '@/lib/supabaseClient';
import { sendSecurityEmail } from '@/lib/emailService';
export { dynamic } from '@/lib/apiDynamic';

export async function POST(req: Request) {
  let status = 'success';
  let error_message = null;
  let code = '';
  let secret = '';
  let ip = '';
  let userAgent = '';
  let email = '';
  try {
    const body = await req.json();
    code = body.code;
    secret = body.secret;
    email = body.email || '';
    ip = (typeof req.headers.get === 'function' ? req.headers.get('x-forwarded-for') : undefined) || 'unknown';
    userAgent = (typeof req.headers.get === 'function' ? req.headers.get('user-agent') : undefined) || '';
    if (!code || !secret) {
      status = 'failure';
      error_message = 'Missing code or secret';
      if (email) {
        sendSecurityEmail({
          to: email,
          subject: '2FA Verification Failed',
          text: `A 2FA verification attempt failed due to missing code or secret from IP ${ip}. If this wasn't you, please contact support.`
        });
      }
      return NextResponse.json({ success: false, error: error_message }, { status: 400 });
    }
    const valid = otplib.authenticator.check(code, secret);
    if (valid) {
      // Here you would persist 2FA enabled state for the user
      if (email) {
        sendSecurityEmail({
          to: email,
          subject: '2FA Verification Success',
          text: `A 2FA verification was successful from IP ${ip}. If this wasn't you, please contact support immediately.`
        });
      }
      return NextResponse.json({ success: true });
    } else {
      status = 'failure';
      error_message = 'Invalid code';
      if (email) {
        sendSecurityEmail({
          to: email,
          subject: '2FA Verification Failed',
          text: `A 2FA verification attempt failed due to invalid code from IP ${ip}. If this wasn't you, please contact support.`
        });
      }
      return NextResponse.json({ success: false, error: error_message }, { status: 401 });
    }
  } catch (err: unknown) {
    status = 'failure';
    error_message = '2FA verification failed';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      error_message = (err as { message: string }).message;
    }
    if (email) {
      sendSecurityEmail({
        to: email,
        subject: '2FA Verification Failed',
        text: `A 2FA verification attempt failed due to a server error from IP ${ip}. If this wasn't you, please contact support.`
      });
    }
    return NextResponse.json({ success: false, error: error_message }, { status: 500 });
  } finally {
    // Audit log insert (non-blocking)
    try {
      await supabase.from('audit_log').insert({
        action: '2fa_verify',
        status,
        ip_address: ip,
        user_agent: userAgent,
        details: { code: code ? 'provided' : 'missing' },
        error_message
      });
    } catch {}
  }
}
