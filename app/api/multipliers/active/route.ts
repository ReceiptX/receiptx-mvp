import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET /api/multipliers/active?user_email=...&telegram_id=...&wallet_address=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const user_email = searchParams.get("user_email");
  const telegram_id = searchParams.get("telegram_id");
  const wallet_address = searchParams.get("wallet_address");

  if (!user_email && !telegram_id && !wallet_address) {
    return NextResponse.json({ error: "User identifier required" }, { status: 400 });
  }

  // Use the same logic as in reward patch: match any identifier
  const userId = user_email || telegram_id || wallet_address;
  if (!userId) {
    return NextResponse.json({ error: "No user identifier found" }, { status: 400 });
  }

  // Query for active multiplier
  const { data, error } = await supabase
    .from("user_multipliers")
    .select("*")
    .eq("active", true)
    .or(`user_id.eq.${userId}`)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("purchased_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ active: false });
  }

  // Pick the highest multiplier
  const parseMultiplier = (slug: string) => {
    const match = slug.match(/(\d+(_\d+)?)/);
    if (!match) return 1.0;
    return parseFloat(match[0].replace('_', '.'));
  };
  data.sort((a, b) => parseMultiplier(b.product_slug) - parseMultiplier(a.product_slug));
  const active = data[0];

  return NextResponse.json({
    active: true,
    multiplier: parseMultiplier(active.product_slug),
    product_slug: active.product_slug,
    expires_at: active.expires_at,
    purchased_at: active.purchased_at
  });
}
