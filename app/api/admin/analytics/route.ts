import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // Aggregate non-PII analytics
  // 1. Total receipts, total RWT, total AIA
  // 2. Brand breakdown (count, RWT per brand)
  const { data: receipts, error } = await supabase
    .from("receipts")
    .select("brand, rwt_earned")
    .neq("brand", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let totalReceipts = 0;
  let totalRWT = 0;
  let totalAIA = 0;
  const brandStats: Record<string, { count: number; rwt: number }> = {};

  for (const r of receipts || []) {
    totalReceipts++;
    totalRWT += r.rwt_earned || 0;
    // Example: AIA is proportional to RWT (customize as needed)
    totalAIA += Math.round((r.rwt_earned || 0) * 0.1);
    if (!brandStats[r.brand]) brandStats[r.brand] = { count: 0, rwt: 0 };
    brandStats[r.brand].count++;
    brandStats[r.brand].rwt += r.rwt_earned || 0;
  }

  return NextResponse.json({
    totalReceipts,
    totalRWT,
    totalAIA,
    brandStats: Object.entries(brandStats).map(([brand, stats]) => ({ brand, ...stats })),
  });
}

