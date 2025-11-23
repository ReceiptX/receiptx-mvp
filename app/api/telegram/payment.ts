import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// TODO: Implement Telegram signature validation for security!

export async function POST(req: NextRequest) {
  const data = await req.json();
  // Example payload: { user_id, product_slug, payment_status }
  const { user_id, product_slug, payment_status } = data;

  if (payment_status === "paid") {
    // Activate multiplier for user in Supabase
    await supabase
      .from("user_multipliers")
      .upsert({
        user_id,
        product_slug,
        active: true,
        purchased_at: new Date().toISOString(),
      });
  }

  return NextResponse.json({ ok: true });
}
