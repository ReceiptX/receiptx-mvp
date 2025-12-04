import crypto from 'crypto';
import { envServer } from './env.server';

export function verifyOcrSignature(rawBody: string, signature: string | null) {
  if (!envServer.ocrWebhookSecret) return false;
  if (!signature) return false;

  const h = crypto
    .createHmac('sha256', envServer.ocrWebhookSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(h));
  } catch (e) {
    return false;
  }
}

export default { verifyOcrSignature };
