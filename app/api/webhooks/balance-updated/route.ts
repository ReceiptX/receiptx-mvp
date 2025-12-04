import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

/**
 * Webhook: Balance Updated
 * Triggered when RWT or AIA balance changes
 * Purpose: Sync off-chain and on-chain token balances
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

    console.log("🔔 Balance Updated Webhook:", {
      type,
      table,
      rwt_balance: record?.rwt_balance,
      aia_balance: record?.aia_balance,
    });

    // Only process UPDATE events where balance changed
    if (type !== "UPDATE") {
      return NextResponse.json({ 
        success: true, 
        message: "Ignored non-UPDATE event" 
      });
    }

    // Check if balance actually changed
    const rwtChanged = record?.rwt_balance !== old_record?.rwt_balance;
    const aiaChanged = record?.aia_balance !== old_record?.aia_balance;

    if (!rwtChanged && !aiaChanged) {
      return NextResponse.json({
        success: true,
        message: "No balance change detected",
      });
    }

    // Extract balance data
    const {
      user_email,
      telegram_id,
      wallet_address,
      rwt_balance,
      aia_balance,
      blockchain_rwt_balance,
      blockchain_aia_balance,
    } = record;

    // Calculate balance differences
    const rwtDiff = rwt_balance - (blockchain_rwt_balance || 0);
    const aiaDiff = aia_balance - (blockchain_aia_balance || 0);

    // TODO: Sync balance to blockchain
    /*
    try {
      if (Math.abs(rwtDiff) > 0) {
        await syncRWTBalance({
          userWallet: wallet_address,
          offChainBalance: rwt_balance,
          onChainBalance: blockchain_rwt_balance || 0,
          difference: rwtDiff,
        });
        console.log("✅ RWT balance synced:", rwtDiff);
      }

      if (Math.abs(aiaDiff) > 0) {
        await syncAIABalance({
          userWallet: wallet_address,
          offChainBalance: aia_balance,
          onChainBalance: blockchain_aia_balance || 0,
          difference: aiaDiff,
        });
        console.log("✅ AIA balance synced:", aiaDiff);
      }
    } catch (error) {
      console.error("❌ Blockchain balance sync failed:", error);
      // Log error but don't fail webhook
    }
    */

    console.log("✅ Balance update webhook processed successfully");

    return NextResponse.json({
      success: true,
      message: "Balance update event processed",
      rwt_balance,
      aia_balance,
      rwt_diff: rwtDiff,
      aia_diff: aiaDiff,
    });

  } catch (error: any) {
    console.error("❌ Balance updated webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error.message },
      { status: 500 }
    );
  }
}
