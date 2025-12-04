import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const client = supabaseAdmin;
    if (!client) {
      console.error("Supabase service role client unavailable in rewards/redeem");
      return NextResponse.json(
        { success: false, error: "Service configuration error" },
        { status: 500 }
      );
    }

    // 1. Get reward details
    type RewardRecord = {
      id: string;
      title: string;
      business_name: string;
      description?: string | null;
      terms?: string | null;
      redemption_instructions?: string | null;
      original_value?: number | null;
      rwt_cost: number;
      max_per_user: number | null;
      claimed_count: number;
      total_stock: number | null;
      is_active: boolean;
      starts_at: string | null;
      expires_at: string | null;
    };


    const { data: rewardRow, error: rewardError } = await client
      .from("business_rewards")
      .select("*")
      .eq("id", reward_id)
      .single();

    if (rewardError || !rewardRow) {
      return NextResponse.json(
        { success: false, error: "Reward not found" },
        { status: 404 }
      );
    }

    const reward = rewardRow as RewardRecord;

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
    let redemptionsQuery = client
      .from("user_redemptions")
      .select("id")
      .eq("reward_id", reward_id)
      .neq("status", "cancelled");

    if (user_email) {
      redemptionsQuery = redemptionsQuery.eq("user_email", user_email);
    } else if (telegram_id) {
      redemptionsQuery = redemptionsQuery.eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      redemptionsQuery = redemptionsQuery.eq("wallet_address", wallet_address);
    }

    const { data: userRedemptions, error: redemptionsError } = await redemptionsQuery;

    if (redemptionsError) {
      console.error("Error fetching user redemptions:", redemptionsError);
      return NextResponse.json(
        { success: false, error: "Failed to verify redemption limit" },
        { status: 500 }
      );
    }

    const userClaimCount = userRedemptions?.length || 0;

    if (reward.max_per_user !== null && userClaimCount >= reward.max_per_user) {
      return NextResponse.json(
        { success: false, error: `You have already claimed this reward ${reward.max_per_user} time(s)` },
        { status: 400 }
      );
    }

    // 5. Get user's RWT balance
    let receiptsQuery = client.from("receipts").select("rwt_earned");

    if (user_email) {
      receiptsQuery = receiptsQuery.eq("user_email", user_email);
    } else if (telegram_id) {
      receiptsQuery = receiptsQuery.eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      receiptsQuery = receiptsQuery.eq("wallet_address", wallet_address);
    }

    const { data: userReceipts, error: receiptsError } = await receiptsQuery;

    if (receiptsError) {
      console.error("Error fetching user receipts:", receiptsError);
      return NextResponse.json(
        { success: false, error: "Failed to calculate rewards balance" },
        { status: 500 }
      );
    }
    const totalEarned = userReceipts?.reduce((sum: number, r: any) => sum + (r.rwt_earned || 0), 0) || 0;

    // Get total spent
    let spentQuery = client.from("user_redemptions").select("rwt_spent");

    if (user_email) {
      spentQuery = spentQuery.eq("user_email", user_email);
    } else if (telegram_id) {
      spentQuery = spentQuery.eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      spentQuery = spentQuery.eq("wallet_address", wallet_address);
    }

    const { data: userRedemptionsData, error: spentError } = await spentQuery;

    if (spentError) {
      console.error("Error fetching redemption spend:", spentError);
      return NextResponse.json(
        { success: false, error: "Failed to calculate redemption spend" },
        { status: 500 }
      );
    }
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
    const redemptionInsert = {
      user_email,
      telegram_id,
      wallet_address,
      reward_id,
      redemption_code: redemptionCode,
      rwt_spent: reward.rwt_cost,
      status: "claimed",
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      metadata: {
        reward_title: reward.title,
        business_name: reward.business_name,
        original_value: reward.original_value,
      },
    };

    const { data: redemption, error: redemptionError } = await (client
      .from("user_redemptions") as any)
      .insert(redemptionInsert as any)
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

