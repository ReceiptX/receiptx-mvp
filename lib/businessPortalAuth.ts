import crypto from 'crypto';

export const BUSINESS_SESSION_COOKIE = 'rx_business_session';
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

type SessionPayload = {
  sub: string;
  iat: number;
  exp: number;
};

export type SessionValidation =
  | { valid: true; payload: SessionPayload }
  | { valid: false; reason: string };

function getPortalSecret() {
  const secret =
    process.env.BUSINESS_PORTAL_SECRET ||
    process.env.BUSINESS_API_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error('Missing BUSINESS_PORTAL_SECRET or BUSINESS_API_KEY');
  }
  return secret;
}

export function constantTimeEquals(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function createBusinessSession(subject: string, ttlMs = DEFAULT_TTL_MS) {
  const now = Date.now();
  const payload: SessionPayload = {
    sub: subject,
    iat: now,
    exp: now + ttlMs,
  };

  const payloadString = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', getPortalSecret()).update(payloadString).digest('hex');

  const token = `${Buffer.from(payloadString).toString('base64url')}.${signature}`;
  return { token, payload };
}

export function verifyBusinessSession(token?: string | null): SessionValidation {
  if (!token) return { valid: false, reason: 'missing_token' };

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return { valid: false, reason: 'malformed_token' };
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'invalid_payload' };
  }

  const expectedSig = crypto.createHmac('sha256', getPortalSecret())
    .update(JSON.stringify(payload))
    .digest('hex');

  if (!constantTimeEquals(signature, expectedSig)) {
    return { valid: false, reason: 'bad_signature' };
  }

  if (Date.now() > payload.exp) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, payload };
}
