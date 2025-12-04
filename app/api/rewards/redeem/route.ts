import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reward_id, user_email, telegram_id, wallet_address } = body;

    // Validate user identifier
    if (!user_email && !telegram_id && !wallet_address) {
      return NextResponse.json(
        { success: false, error: "User identifier required" },
        { status: 400 }
      );
    }

    if (!reward_id) {
      return NextResponse.json(
        { success: false, error: "Reward ID is required" },
        { status: 400 }
      );
    }

    // 1. Get reward details
    const { data: reward, error: rewardError } = await supabase
      .from("business_rewards")
      .select("*")
      .eq("id", reward_id)
      .single();

    if (rewardError || !reward) {
      return NextResponse.json(
        { success: false, error: "Reward not found" },
        { status: 404 }
      );
    }

    // 2. Check if reward is available
    if (!reward.is_active) {
      return NextResponse.json(
        { success: false, error: "Reward is no longer active" },
        { status: 400 }
      );
    }

    if (reward.starts_at && new Date(reward.starts_at) > new Date()) {
      return NextResponse.json(
        { success: false, error: "Reward is not yet available" },
        { status: 400 }
      );
    }

    if (reward.expires_at && new Date(reward.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Reward has expired" },
        { status: 400 }
      );
    }

    // 3. Check stock availability
    if (reward.total_stock !== null && reward.claimed_count >= reward.total_stock) {
      return NextResponse.json(
        { success: false, error: "Reward is out of stock" },
        { status: 400 }
      );
    }

    // 4. Check user's claim limit
    const { data: userRedemptions, error: redemptionsError } = await supabase
      .from("user_redemptions")
      .select("id")
      .eq("reward_id", reward_id)
      .neq("status", "cancelled");

    if (user_email) {
      userRedemptions && await supabase.from("user_redemptions").select("id").eq("user_email", user_email);
    } else if (telegram_id) {
      userRedemptions && await supabase.from("user_redemptions").select("id").eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      userRedemptions && await supabase.from("user_redemptions").select("id").eq("wallet_address", wallet_address);
    }

    const userClaimCount = userRedemptions?.length || 0;

    if (userClaimCount >= reward.max_per_user) {
      return NextResponse.json(
        { success: false, error: `You have already claimed this reward ${reward.max_per_user} time(s)` },
        { status: 400 }
      );
    }

    // 5. Get user's RWT balance
    const { data: receipts } = await supabase
      .from("receipts")
      .select("rwt_earned");

    let query = supabase.from("receipts").select("rwt_earned");

    if (user_email) {
      query = query.eq("user_email", user_email);
    } else if (telegram_id) {
      query = query.eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      query = query.eq("wallet_address", wallet_address);
    }

    const { data: userReceipts } = await query;
    const totalEarned = userReceipts?.reduce((sum: number, r: any) => sum + (r.rwt_earned || 0), 0) || 0;

    // Get total spent
    let spentQuery = supabase.from("user_redemptions").select("rwt_spent");

    if (user_email) {
      spentQuery = spentQuery.eq("user_email", user_email);
    } else if (telegram_id) {
      spentQuery = spentQuery.eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      spentQuery = spentQuery.eq("wallet_address", wallet_address);
    }

    const { data: userRedemptionsData } = await spentQuery;
    const totalSpent = userRedemptionsData?.reduce((sum: number, r: any) => sum + (r.rwt_spent || 0), 0) || 0;

    const rwtBalance = totalEarned - totalSpent;

    // 6. Check if user has enough RWT
    if (rwtBalance < reward.rwt_cost) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient RWT. You need ${reward.rwt_cost} RWT but only have ${rwtBalance} RWT`,
          balance: rwtBalance,
          required: reward.rwt_cost,
        },
        { status: 400 }
      );
    }

    // 7. Generate redemption code
    const generateCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      return `RXT-${part1}-${part2}`;
    };

    const redemptionCode = generateCode();

    // Calculate expiry date if reward has expiry
    const expiresAt = reward.expires_at ? new Date(reward.expires_at) : null;

    // 8. Create redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from("user_redemptions")
      .insert({
        user_email,
        telegram_id,
        wallet_address,
        reward_id,
        redemption_code: redemptionCode,
        rwt_spent: reward.rwt_cost,
        status: "claimed",
        expires_at: expiresAt,
        metadata: {
          reward_title: reward.title,
          business_name: reward.business_name,
          original_value: reward.original_value,
        },
      })
      .select()
      .single();

    if (redemptionError) {
      console.error("Error creating redemption:", redemptionError);
      return NextResponse.json(
        { success: false, error: "Failed to process redemption" },
        { status: 500 }
      );
    }

    // 9. Return success with redemption details
    return NextResponse.json({
      success: true,
      redemption: {
        id: redemption.id,
        code: redemption.redemption_code,
        reward: {
          title: reward.title,
          business_name: reward.business_name,
          description: reward.description,
          terms: reward.terms,
          redemption_instructions: reward.redemption_instructions,
          original_value: reward.original_value,
        },
        rwt_spent: reward.rwt_cost,
        new_balance: rwtBalance - reward.rwt_cost,
        claimed_at: redemption.claimed_at,
        expires_at: redemption.expires_at,
      },
      message: "Reward redeemed successfully!",
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

