import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import * as otplib from 'otplib';
import qrcode from 'qrcode';
import { sendSecurityEmail } from '@/lib/emailService';
export { dynamic } from '@/lib/apiDynamic';

export async function POST(req: Request) {
  let email = '';
  try {
    if (req) {
      const body = await req.json().catch(() => ({}));
      email = body.email || '';
    }
  } catch {}
  // Generate a TOTP secret
  const secret = otplib.authenticator.generateSecret();
  const otpauth = otplib.authenticator.keyuri(email || 'user@example.com', 'ReceiptX', secret);
  const qr = await qrcode.toDataURL(otpauth);
  if (email) {
    sendSecurityEmail({
      to: email,
      subject: '2FA Setup Initiated',
      text: `A 2FA setup was initiated for your account. If this wasn't you, please contact support immediately.`
    });
  }
  return NextResponse.json({ secret, qr });
}
