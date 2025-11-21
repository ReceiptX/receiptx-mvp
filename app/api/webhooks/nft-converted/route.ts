import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook: NFT Converted
 * Triggered when an NFT is converted to AIA tokens
 * Purpose: Burn NFT on-chain and mint AIA tokens
 */
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

    console.log("🔔 NFT Converted Webhook:", {
      type,
      table,
      nft_type: record?.nft_type,
      aia_received: record?.aia_received,
    });

    // Only process UPDATE events where status changed to 'converted'
    if (type !== "UPDATE") {
      return NextResponse.json({ 
        success: true, 
        message: "Ignored non-UPDATE event" 
      });
    }

    if (record?.status !== "converted" || old_record?.status !== "active") {
      return NextResponse.json({
        success: true,
        message: "Ignored - not a conversion event",
      });
    }

    // Extract conversion data
    const {
      id,
      user_email,
      telegram_id,
      wallet_address,
      nft_type,
      token_id,
      aia_received,
      converted_at,
    } = record;

    // TODO: Burn NFT and mint AIA on blockchain
    /*
    try {
      // 1. Burn the NFT
      await burnNFTOnChain({
        tokenId: token_id,
        userWallet: wallet_address,
      });

      // 2. Mint AIA tokens
      await mintAIATokens({
        userWallet: wallet_address,
        amount: aia_received,
        reason: `NFT_CONVERSION:${nft_type}`,
      });

      console.log("✅ NFT burned and AIA minted on-chain");
    } catch (error) {
      console.error("❌ Blockchain conversion failed:", error);
      // Log error but don't fail webhook
    }
    */

    console.log("✅ NFT conversion webhook processed successfully");

    return NextResponse.json({
      success: true,
      message: "NFT conversion event processed",
      nft_id: id,
      aia_received,
    });

  } catch (error: any) {
    console.error("❌ NFT converted webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error.message },
      { status: 500 }
    );
  }
}
