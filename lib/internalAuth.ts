// @ts-nocheck
import { env } from './env';

function timingSafeEqual(a?: string, b?: string) {
  if (!a || !b) return false;
  const encoder = new TextEncoder();
  const ta = encoder.encode(a);
  const tb = encoder.encode(b);

  // Iterate over max length to avoid leaking length information.
  const max = Math.max(ta.length, tb.length);
  let diff = 0;
  for (let i = 0; i < max; i++) {
    const va = ta[i] || 0;
    const vb = tb[i] || 0;
    diff |= va ^ vb;
  }
  return diff === 0;
}

export function verifyInternalSecret(req: Request, kind: 'ocr' | 'internal') {
  const headerName =
    kind === 'ocr' ? 'x-receiptx-ocr-secret' : 'x-receiptx-internal-secret';
  const headerValue = req.headers.get(headerName)?.trim();

  const expected =
    kind === 'ocr'
      ? env.RECEIPTX_OCR_WEBHOOK_SECRET
      : env.RECEIPTX_INTERNAL_API_SECRET;

  return headerValue ? timingSafeEqual(headerValue, expected) : false;
}
