import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook: NFT Minted
 * Triggered when a new NFT is created in the database
 * Purpose: Sync NFT minting to blockchain
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
    const { type, table, record, schema, old_record } = payload;

    console.log("🔔 NFT Minted Webhook:", {
      type,
      table,
      nft_type: record?.nft_type,
      user: record?.user_email || record?.telegram_id || record?.wallet_address,
    });

    // Only process INSERT events
    if (type !== "INSERT") {
      return NextResponse.json({ 
        success: true, 
        message: "Ignored non-INSERT event" 
      });
    }

    // Extract NFT data
    const {
      id,
      user_email,
      telegram_id,
      wallet_address,
      nft_type,
      token_id,
      metadata,
    } = record;

    // TODO: Mint NFT on blockchain
    // This is where you'd call your smart contract
    /*
    try {
      const blockchainResult = await mintNFTOnChain({
        userWallet: wallet_address,
        nftType: nft_type,
        tokenId: token_id,
        metadata: metadata,
      });

      console.log("✅ NFT minted on-chain:", blockchainResult);
    } catch (error) {
      console.error("❌ Blockchain mint failed:", error);
      // Log to error tracking service
      // Don't fail webhook - retry mechanism will handle it
    }
    */

    console.log("✅ NFT minted webhook processed successfully");

    return NextResponse.json({
      success: true,
      message: "NFT mint event processed",
      nft_id: id,
      nft_type,
    });

  } catch (error: any) {
    console.error("❌ NFT minted webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error.message },
      { status: 500 }
    );
  }
}
