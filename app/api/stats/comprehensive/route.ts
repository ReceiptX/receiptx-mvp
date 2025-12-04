import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  console.log("[/api/stats/comprehensive] invoked");
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("user_email") || searchParams.get("email");
    const telegram_id = searchParams.get("telegram_id");
    const wallet_address = searchParams.get("wallet_address");

    if (!email && !telegram_id && !wallet_address) {
      return NextResponse.json(
        { error: "User identifier required" },
        { status: 400 }
      );
    }

    const client = supabaseAdmin;
    if (!client) {
      console.error("Supabase service role client unavailable in stats/comprehensive");
      return NextResponse.json({ error: "Service configuration error" }, { status: 500 });
    }

    // Call the comprehensive stats function with service role to access cross-tenant data safely
    const { data, error } = await client.rpc("get_user_comprehensive_stats" as any, {
      p_user_email: email || null,
      p_telegram_id: telegram_id || null,
      p_wallet_address: wallet_address || null
    } as any);

    if (error) {
      console.error("Error fetching comprehensive stats:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows: any[] = Array.isArray(data) ? data : [];
    const stats = rows.length > 0 ? rows[0] : {
      total_receipts: 0,
      total_rwt_earned: 0,
      total_aia_earned: 0,
      average_rwt_per_receipt: 0,
      current_tier: "Bronze",
      staked_aia: 0,
      active_nfts: 0,
      referral_bonuses: 0,
      risk_status: "Clean"
    };

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error("Error in comprehensive stats endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

