import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
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

    // Call the comprehensive stats function
    const { data, error } = await supabase.rpc("get_user_comprehensive_stats", {
      p_user_email: email,
      p_telegram_id: telegram_id,
      p_wallet_address: wallet_address
    });

    if (error) {
      console.error("Error fetching comprehensive stats:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats = data && data.length > 0 ? data[0] : {
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
