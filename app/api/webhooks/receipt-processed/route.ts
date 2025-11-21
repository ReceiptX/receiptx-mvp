import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Webhook: Receipt Processed
 * Triggered when a receipt is verified and processed
 * Purpose: Sync receipt hash to Move VM registry (anti-fraud)
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
    const { type, table, record } = payload;

    console.log("🔔 Receipt Processed Webhook:", {
      type,
      table,
      receipt_id: record?.id,
      verified: record?.verified,
    });

    // Only process INSERT events for verified receipts
    if (type !== "INSERT") {
      return NextResponse.json({ 
        success: true, 
        message: "Ignored non-INSERT event" 
      });
    }

    // Extract receipt data
    const {
      id,
      user_email,
      telegram_id,
      wallet_address,
      brand,
      amount,
      multiplier,
      rwt_earned,
      receipt_date,
      metadata,
    } = record;

    // Generate receipt hash for blockchain registry
    const receiptHash = generateReceiptHash(record);

    // TODO: Register receipt hash on Move VM
    /*
    try {
      await registerReceiptHashOnChain({
        receiptId: id,
        receiptHash: receiptHash,
        userWallet: wallet_address,
        brand: brand,
        amount: amount,
        rwtEarned: rwt_earned,
        timestamp: Date.now(),
      });

      console.log("✅ Receipt hash registered on-chain:", receiptHash);
    } catch (error) {
      console.error("❌ Blockchain receipt registration failed:", error);
      // Log error but don't fail webhook
    }
    */

    console.log("✅ Receipt processed webhook handled successfully");

    return NextResponse.json({
      success: true,
      message: "Receipt processing event handled",
      receipt_id: id,
      receipt_hash: receiptHash,
      rwt_earned,
    });

  } catch (error: any) {
    console.error("❌ Receipt processed webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate deterministic receipt hash for duplicate detection
 */
function generateReceiptHash(receipt: any): string {
  const canonicalData = {
    user: receipt.user_email || receipt.telegram_id || receipt.wallet_address,
    brand: receipt.brand,
    amount: receipt.amount,
    date: receipt.receipt_date,
    // Don't include ID or timestamps - those change
  };

  const dataString = JSON.stringify(canonicalData);
  return crypto.createHash("sha256").update(dataString).digest("hex");
}
