import { NextRequest, NextResponse } from "next/server";
import { supabaseService as supabase } from "@/lib/supabaseServiceClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_email, telegram_id, wallet_address, amount } = body;

    if (!user_email && !telegram_id && !wallet_address) {
      return NextResponse.json(
        { error: "User identifier required" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid unstaking amount" },
        { status: 400 }
      );
    }

    // Get tier record
    let tierQuery = supabase.from("user_tiers").select("*");
    if (user_email) tierQuery = tierQuery.eq("user_email", user_email);
    else if (telegram_id) tierQuery = tierQuery.eq("telegram_id", telegram_id);
    else tierQuery = tierQuery.eq("wallet_address", wallet_address);

    const { data: tier, error: tierError } = await tierQuery.single();

    if (tierError || !tier) {
      return NextResponse.json(
        { error: "No staking record found" },
        { status: 404 }
      );
    }

    if (tier.staked_aia < amount) {
      return NextResponse.json(
        { error: "Insufficient staked balance" },
        { status: 400 }
      );
    }

    const newStakedAmount = tier.staked_aia - amount;
    const newTier = calculateTier(newStakedAmount);

    // Update tier record
    let updateTierQuery = supabase
      .from("user_tiers")
      .update({
        staked_aia: newStakedAmount,
        current_tier: newTier,
        unstaked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (user_email) updateTierQuery = updateTierQuery.eq("user_email", user_email);
    else if (telegram_id) updateTierQuery = updateTierQuery.eq("telegram_id", telegram_id);
    else updateTierQuery = updateTierQuery.eq("wallet_address", wallet_address);

    await updateTierQuery;

    // Return AIA to available balance in user_stats
    let balanceQuery = supabase.from("user_stats").select("total_aia_earned");
    if (user_email) balanceQuery = balanceQuery.eq("user_email", user_email);
    else if (telegram_id) balanceQuery = balanceQuery.eq("telegram_id", telegram_id);
    else balanceQuery = balanceQuery.eq("wallet_address", wallet_address);

    const { data: balance } = await balanceQuery.single();
    const newAiaBalance = (balance?.total_aia_earned || 0) + amount;

    let updateBalanceQuery = supabase.from("user_stats").update({ total_aia_earned: newAiaBalance });
    if (user_email) updateBalanceQuery = updateBalanceQuery.eq("user_email", user_email);
    else if (telegram_id) updateBalanceQuery = updateBalanceQuery.eq("telegram_id", telegram_id);
    else updateBalanceQuery = updateBalanceQuery.eq("wallet_address", wallet_address);

    await updateBalanceQuery;

    return NextResponse.json({
      success: true,
      unstaked_amount: amount,
      remaining_staked: newStakedAmount,
      new_tier: newTier,
      available_aia: newAiaBalance,
      message: `Successfully unstaked ${amount} AIA! Your tier is now ${newTier}.`
    });
  } catch (error: any) {
    console.error("Error in unstake endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

function calculateTier(stakedAmount: number): string {
  if (stakedAmount >= 10000) return "Premium";
  if (stakedAmount >= 1000) return "Gold";
  if (stakedAmount >= 100) return "Silver";
  return "Bronze";
}
