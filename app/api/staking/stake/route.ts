import { NextRequest, NextResponse } from "next/server";
import { supabaseService as supabase } from "@/lib/supabaseServiceClient";

// POST: Stake AIA
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
        { error: "Invalid staking amount" },
        { status: 400 }
      );
    }

    // Check user's AIA balance from user_stats
    let balanceQuery = supabase.from("user_stats").select("total_aia_earned");
    if (user_email) balanceQuery = balanceQuery.eq("user_email", user_email);
    else if (telegram_id) balanceQuery = balanceQuery.eq("telegram_id", telegram_id);
    else balanceQuery = balanceQuery.eq("wallet_address", wallet_address);

    const { data: balance } = await balanceQuery.single();

    if (!balance || balance.total_aia_earned < amount) {
      return NextResponse.json(
        { error: "Insufficient AIA balance" },
        { status: 400 }
      );
    }

    // Get or create tier record
    let tierQuery = supabase.from("user_tiers").select("*");
    if (user_email) tierQuery = tierQuery.eq("user_email", user_email);
    else if (telegram_id) tierQuery = tierQuery.eq("telegram_id", telegram_id);
    else tierQuery = tierQuery.eq("wallet_address", wallet_address);

    const { data: existingTier } = await tierQuery.single();

    const newStakedAmount = (existingTier?.staked_aia || 0) + amount;
    const newTier = calculateTier(newStakedAmount);

    // Upsert tier record
    const tierData: any = {
      staked_aia: newStakedAmount,
      current_tier: newTier,
      staked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (user_email) tierData.user_email = user_email;
    if (telegram_id) tierData.telegram_id = telegram_id;
    if (wallet_address) tierData.wallet_address = wallet_address;

    const { error: tierError } = await supabase
      .from("user_tiers")
      .upsert([tierData], {
        onConflict: user_email ? "user_email" : telegram_id ? "telegram_id" : "wallet_address"
      });

    if (tierError) {
      console.error("Error updating tier:", tierError);
      return NextResponse.json({ error: tierError.message }, { status: 500 });
    }

    // Deduct AIA from available balance (transfer to staking)
    const newAiaBalance = balance.total_aia_earned - amount;
    
    let updateBalanceQuery = supabase.from("user_stats").update({ total_aia_earned: newAiaBalance });
    if (user_email) updateBalanceQuery = updateBalanceQuery.eq("user_email", user_email);
    else if (telegram_id) updateBalanceQuery = updateBalanceQuery.eq("telegram_id", telegram_id);
    else updateBalanceQuery = updateBalanceQuery.eq("wallet_address", wallet_address);

    await updateBalanceQuery;

    return NextResponse.json({
      success: true,
      staked_amount: amount,
      total_staked: newStakedAmount,
      new_tier: newTier,
      remaining_aia: newAiaBalance,
      message: `Successfully staked ${amount} AIA! Your tier is now ${newTier}.`
    });
  } catch (error: any) {
    console.error("Error in stake endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Get staking info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const telegram_id = searchParams.get("telegram_id");
    const wallet_address = searchParams.get("wallet_address");

    if (!email && !telegram_id && !wallet_address) {
      return NextResponse.json(
        { error: "User identifier required" },
        { status: 400 }
      );
    }

    let query = supabase.from("user_tiers").select("*");
    if (email) query = query.eq("user_email", email);
    else if (telegram_id) query = query.eq("telegram_id", telegram_id);
    else query = query.eq("wallet_address", wallet_address);

    const { data: tier } = await query.single();

    // Get tier requirements
    const { data: requirements } = await supabase
      .from("tier_requirements")
      .select("*")
      .order("staking_requirement", { ascending: true });

    return NextResponse.json({
      staked_aia: tier?.staked_aia || 0,
      current_tier: tier?.current_tier || "Bronze",
      staked_at: tier?.staked_at,
      tier_requirements: requirements || []
    });
  } catch (error: any) {
    console.error("Error in staking info endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to calculate tier
function calculateTier(stakedAmount: number): string {
  if (stakedAmount >= 10000) return "Premium";
  if (stakedAmount >= 1000) return "Gold";
  if (stakedAmount >= 100) return "Silver";
  return "Bronze";
}
