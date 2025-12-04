import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabaseServiceClient'
import { BASE_RWT_PER_CURRENCY_UNIT } from '@/lib/multipliers'
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { brand, amount, multiplier, location, telegram_id, wallet_address, metadata, user_email } = body

    // Validate required fields
    if (!brand || !amount || (!telegram_id && !user_email && !wallet_address)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Resolve user_id so we satisfy the NOT NULL constraint on receipts.user_id
    let userId: string | null = null

    try {
      if (user_email) {
        const { data } = await supabaseService
          .from("users")
          .select("id")
          .eq("email", user_email)
          .maybeSingle()

        if (data?.id) {
          userId = data.id
        }
      }

      if (!userId && telegram_id) {
        const { data } = await supabaseService
          .from("users")
          .select("id")
          .eq("telegram_id", telegram_id)
          .maybeSingle()

        if (data?.id) {
          userId = data.id
        }
      }

      if (!userId && wallet_address) {
        const { data } = await supabaseService
          .from("user_wallets")
          .select("user_id")
          .eq("wallet_address", wallet_address)
          .maybeSingle()

        if (data?.user_id) {
          userId = data.user_id
        }
      }
    } catch (lookupError) {
      console.error("User lookup failed:", lookupError)
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User not found for provided identifiers" },
        { status: 404 }
      )
    }

    // Insert receipt
    const { data, error } = await supabaseService
      .from("receipts")
      .insert({
        user_id: userId,
        user_email,
        brand,
        amount,
        multiplier,
        location,
        telegram_id,
        wallet_address,
        metadata
      })
      .select()

    if (error) {
      console.error("DB Insert Error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const receipt = data[0]

    // Compute simple rewards
    const baseRwt = Number(amount) * BASE_RWT_PER_CURRENCY_UNIT
    const totalRwt = Math.round(baseRwt * (multiplier || 1))
    const totalAia = 0

    // Upsert user_stats (simple increment)
    try {
      const { data: existingStats } = await supabaseService
        .from("user_stats")
        .select("*")
        .or(`user_email.eq.${user_email || 'null'},telegram_id.eq.${telegram_id || 'null'},wallet_address.eq.${wallet_address || 'null'}`)
        .maybeSingle()

      if (existingStats) {
        await supabaseService
          .from("user_stats")
          .update({
            total_receipts: (existingStats.total_receipts || 0) + 1,
            total_rwt_earned: Number(existingStats.total_rwt_earned || 0) + totalRwt,
            average_rwt_per_receipt: ((Number(existingStats.total_rwt_earned || 0) + totalRwt) / ((existingStats.total_receipts || 0) + 1)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingStats.id)
      } else {
        await supabaseService
          .from("user_stats")
          .insert({
            user_email,
            telegram_id,
            wallet_address,
            total_receipts: 1,
            total_rwt_earned: totalRwt,
            average_rwt_per_receipt: totalRwt,
            current_tier: 'bronze',
          })
      }
    } catch (statsErr) {
      console.error("Stats update failed (non-blocking):", statsErr)
    }

    // Log reward
    try {
      await supabaseService
        .from("user_rewards")
        .insert({
          user_email,
          telegram_id,
          wallet_address,
          brand,
          base_amount: amount,
          multiplier,
          total_reward: totalRwt,
          receipt_id: receipt.id,
        })
    } catch (rewardErr) {
      console.error("Reward log failed (non-blocking):", rewardErr)
    }

    return NextResponse.json({ success: true, receipt })
  } catch (err: any) {
    console.error("Unexpected error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Unknown server error" },
      { status: 500 }
    )
  }
}
