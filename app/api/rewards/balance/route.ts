import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseServiceClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
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

    const client = supabaseService;

    // Get total RWT earned from receipts
    let receiptsQuery = client.from("receipts").select("rwt_earned");

    if (user_email) {
      receiptsQuery = receiptsQuery.eq("user_email", user_email);
    } else if (telegram_id) {
      receiptsQuery = receiptsQuery.eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      receiptsQuery = receiptsQuery.eq("wallet_address", wallet_address);
    }

    const { data: receipts, error: receiptsError } = await receiptsQuery;

    if (receiptsError) {
      console.error("balance receipts query failed", receiptsError);
      return NextResponse.json(
        { error: "Failed to load receipt rewards" },
        { status: 500 }
      );
    }
    const totalEarned = receipts?.reduce((sum: number, r: { rwt_earned?: number }) => sum + (r.rwt_earned || 0), 0) || 0;

    // Get total RWT spent on redemptions
    let redemptionsQuery = client
      .from("user_redemptions")
      .select("rwt_spent")
      .neq("status", "cancelled");

    if (user_email) {
      redemptionsQuery = redemptionsQuery.eq("user_email", user_email);
    } else if (telegram_id) {
      redemptionsQuery = redemptionsQuery.eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      redemptionsQuery = redemptionsQuery.eq("wallet_address", wallet_address);
    }

    const { data: redemptions, error: redemptionsError } = await redemptionsQuery;

    if (redemptionsError) {
      console.error("balance redemptions query failed", redemptionsError);
      return NextResponse.json(
        { error: "Failed to load redemption history" },
        { status: 500 }
      );
    }
    const totalSpent = redemptions?.reduce((sum: number, r: { rwt_spent?: number }) => sum + (r.rwt_spent || 0), 0) || 0;

    // Calculate current balance
    const rwtBalance = totalEarned - totalSpent;

    // Get AIA balance from user_stats
    let aiaBalance = 0;
    
    let statsQuery = client.from("user_stats").select("total_aia_earned");
    
    if (user_email) {
      statsQuery = statsQuery.eq("user_email", user_email);
    } else if (telegram_id) {
      statsQuery = statsQuery.eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      statsQuery = statsQuery.eq("wallet_address", wallet_address);
    }

    const { data: statsData, error: statsError } = await statsQuery.single();

    if (statsError && statsError.code !== "PGRST116") {
      // PGRST116 = row not found, treat as zero balance
      console.error("balance stats query failed", statsError);
      return NextResponse.json(
        { error: "Failed to load AIA balance" },
        { status: 500 }
      );
    }

    if (statsData) {
      aiaBalance = statsData.total_aia_earned || 0;
    }

    return NextResponse.json({
      success: true,
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

