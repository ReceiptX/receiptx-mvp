import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook: Tier Updated
 * Triggered when user stakes/unstakes AIA or tier changes
 * Purpose: Sync staking tier and multiplier to blockchain
 */
export { dynamic } from "@/lib/apiDynamic";
export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = req.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.WEBHOOK_SECRET}`;

    if (!authHeader || authHeader !== expectedAuth) {
      console.error("❌ Webhook auth failed");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse Supabase webhook payload
    const payload = await req.json();
    const { type, table, record, old_record } = payload;

    console.log("🔔 Tier Updated Webhook:", {
      type,
      table,
      tier: record?.current_tier,
      staked_aia: record?.staked_aia,
    });

    // Process INSERT or UPDATE events
    if (type !== "INSERT" && type !== "UPDATE") {
      return NextResponse.json({ 
        success: true, 
        message: "Ignored event type" 
      });
    }

    // Check if staked_aia actually changed (for UPDATE events)
    if (type === "UPDATE" && 
        record?.staked_aia === old_record?.staked_aia &&
        record?.current_tier === old_record?.current_tier) {
      return NextResponse.json({
        success: true,
        message: "No tier change detected",
      });
    }

    // Extract tier data
    const {
      id,
      user_email,
      telegram_id,
      wallet_address,
      current_tier,
      staked_aia,
      benefits,
    } = record;

    // Get multiplier from benefits
    const multiplier = benefits?.multiplier || 1.0;

    // TODO: Update tier on blockchain
    /*
    try {
      await updateTierOnChain({
        userWallet: wallet_address,
        tier: current_tier,
        stakedAIA: staked_aia,
        multiplier: multiplier,
      });

      console.log("✅ Tier updated on-chain:", {
        tier: current_tier,
        multiplier,
      });
    } catch (error) {
      console.error("❌ Blockchain tier update failed:", error);
      // Log error but don't fail webhook
    }
    */

    console.log("✅ Tier update webhook processed successfully");

    return NextResponse.json({
      success: true,
      message: "Tier update event processed",
      tier: current_tier,
      staked_aia,
      multiplier,
    });

  } catch (error: any) {
    console.error("❌ Tier updated webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error.message },
      { status: 500 }
    );
  }
}
