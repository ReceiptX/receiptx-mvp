import { NextResponse } from 'next/server';
import { verifyOcrSignature } from '@/lib/hmac';
import { supabaseService } from '@/lib/supabaseServiceClient';
import { rateLimit } from '@/lib/rateLimit';
import { issueReferralReward } from '@/lib/rewardsWaitlistDirect';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'ocr';
  if (!rateLimit(`ocr:${ip}`, 20, 1_000)) {
    return NextResponse.json({ error: 'Too many OCR calls' }, { status: 429 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get('x-rxt-signature');

  if (!verifyOcrSignature(rawBody, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    receipt_id,
    user_id,
    total_amount,
    currency = 'USD',
    merchant_name,
    purchase_ts,
    has_multiplier = false,
    line_items = [],
    raw_ocr,
  } = payload;

  if (!receipt_id || !user_id || !Number.isFinite(Number(total_amount))) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { error: updErr } = await supabaseService
    .from('receipts')
    .update({
      user_id,
      total: total_amount,
      currency,
      merchant_name,
      purchase_ts,
      has_multiplier,
      status: 'processed',
      ocr_processed_at: new Date().toISOString(),
    })
    .eq('id', receipt_id);

  if (updErr) {
    console.error('Failed to update receipt after OCR', updErr);
    return NextResponse.json({ error: 'Failed to update receipt' }, { status: 500 });
  }

  if (Array.isArray(line_items) && line_items.length > 0) {
    const itemsToInsert = line_items.map((item: any) => ({
      receipt_id,
      description: item.description,
      quantity: item.quantity ?? 1,
      unit_price: item.unit_price ?? null,
      total_price: item.total_price ?? null,
      brand_id: item.brand_id ?? null,
    }));

    const { error: liErr } = await supabaseService.from('receipt_line_items').insert(itemsToInsert);
    if (liErr) console.error('Failed to insert line items', liErr);
  }

  const { error: logErr } = await supabaseService.from('ocr_logs').insert({
    user_id,
    receipt_id,
    provider: 'internal',
    raw_ocr_json: raw_ocr ?? null,
  });
  if (logErr) console.error('Failed to insert OCR log', logErr);

  // Issue referral reward directly if this was the referred user's first receipt
  try {
    await issueReferralReward(user_id, Boolean(has_multiplier));
    console.log(`✅ Referral reward processed for user ${user_id}`);
  } catch (refErr) {
    console.error('⚠️ Failed to process referral reward:', refErr);
    // Don't fail the webhook if referral processing fails
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export default { POST };
