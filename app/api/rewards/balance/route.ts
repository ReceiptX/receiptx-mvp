import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_email = searchParams.get("user_email");
    const telegram_id = searchParams.get("telegram_id");
    const wallet_address = searchParams.get("wallet_address");

    if (!user_email && !telegram_id && !wallet_address) {
      return NextResponse.json(
        { error: "user_email, telegram_id, or wallet_address required" },
        { status: 400 }
      );
    }

    // Get total RWT earned from receipts
    let receiptsQuery = supabase.from("receipts").select("rwt_earned");

    if (user_email) {
      receiptsQuery = receiptsQuery.eq("user_email", user_email);
    } else if (telegram_id) {
      receiptsQuery = receiptsQuery.eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      receiptsQuery = receiptsQuery.eq("wallet_address", wallet_address);
    }

    const { data: receipts } = await receiptsQuery;
    const totalEarned = receipts?.reduce((sum: number, r: { rwt_earned?: number }) => sum + (r.rwt_earned || 0), 0) || 0;

    // Get total RWT spent on redemptions
    let redemptionsQuery = supabase.from("user_redemptions").select("rwt_spent");

    if (user_email) {
      redemptionsQuery = redemptionsQuery.eq("user_email", user_email);
    } else if (telegram_id) {
      redemptionsQuery = redemptionsQuery.eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      redemptionsQuery = redemptionsQuery.eq("wallet_address", wallet_address);
    }

    const { data: redemptions } = await redemptionsQuery;
    const totalSpent = redemptions?.reduce((sum: number, r: { rwt_spent?: number }) => sum + (r.rwt_spent || 0), 0) || 0;

    // Calculate current balance
    const rwtBalance = totalEarned - totalSpent;

    // Get AIA balance (if exists in user_stats)
    let aiaBalance = 0;
    
    let statsQuery = supabase.from("user_stats").select("aia_balance");
    
    if (user_email) {
      statsQuery = statsQuery.eq("user_email", user_email);
    } else if (telegram_id) {
      statsQuery = statsQuery.eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      statsQuery = statsQuery.eq("wallet_address", wallet_address);
    }

    const { data: statsData } = await statsQuery.single();

    if (statsData) {
      aiaBalance = statsData.aia_balance || 0;
    }

    return NextResponse.json({
      rwtBalance: rwtBalance,
      aiaBalance: aiaBalance,
      rwt_earned: totalEarned,
      rwt_spent: totalSpent,
      blockchainRwtBalance: 0,
      blockchainAiaBalance: 0,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error in balance endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
