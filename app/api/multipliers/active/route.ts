import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseServiceClient";

// GET /api/multipliers/active?user_email=...&telegram_id=...&wallet_address=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const user_email = searchParams.get("user_email");
  const telegram_id = searchParams.get("telegram_id");
  const wallet_address = searchParams.get("wallet_address");

  if (!user_email && !telegram_id && !wallet_address) {
    return NextResponse.json({ error: "User identifier required" }, { status: 400 });
  }

  const identifierFilters: string[] = [];
  if (user_email) identifierFilters.push(`user_email.eq.${user_email}`);
  if (telegram_id) identifierFilters.push(`telegram_id.eq.${telegram_id}`);
  if (wallet_address) identifierFilters.push(`wallet_address.eq.${wallet_address}`);

  if (!identifierFilters.length) {
    return NextResponse.json({ error: "No user identifier found" }, { status: 400 });
  }

  let query = supabaseService
    .from("user_multipliers")
    .select("*")
    .eq("active", true)
    .order("purchased_at", { ascending: false });

  query = query.or(identifierFilters.join(','));

  const { data, error } = await query;

  if (error) {
    console.error("[multipliers/active] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const multipliers = (data || []) as any[];

  if (multipliers.length === 0) {
    return NextResponse.json({ active: false });
  }

  const now = Date.now();
  const usable = multipliers.filter(
    (item) => !item.expires_at || new Date(item.expires_at as any).getTime() > now
  );

  if (usable.length === 0) {
    return NextResponse.json({ active: false });
  }

  // Pick the highest multiplier
  const parseMultiplier = (slug: string) => {
    const match = slug.match(/(\d+(_\d+)?)/);
    if (!match) return 1.0;
    return parseFloat(match[0].replace('_', '.'));
  };
  usable.sort((a, b) => parseMultiplier(b.product_slug) - parseMultiplier(a.product_slug));
  const active = usable[0];

  return NextResponse.json({
    active: true,
    multiplier: parseMultiplier(active.product_slug),
    product_slug: active.product_slug,
    expires_at: active.expires_at,
    purchased_at: active.purchased_at
  });
}
