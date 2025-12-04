// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export async function POST(request: NextRequest) {
  try {
    const { payment_id, telegram_id, reason } = await request.json();

    if (!payment_id || !telegram_id) {
      return NextResponse.json(
        { error: "payment_id and telegram_id are required" },
        { status: 400 }
      );
    }

    // Get transaction details
    const { data: transaction, error: txError } = await supabase
      .from("telegram_transactions")
      .select("*")
      .eq("payment_id", payment_id)
      .single();

    if (txError || !transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.status === "refunded") {
      return NextResponse.json({ error: "Already refunded" }, { status: 400 });
    }

    // Issue refund via Telegram API
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/refundStarPayment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: telegram_id,
          telegram_payment_charge_id: payment_id
        })
      }
    );

    const result = await response.json();

    if (!result.ok) {
      return NextResponse.json(
        { error: result.description || "Refund failed" },
        { status: 400 }
      );
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from("telegram_transactions")
      .update({
        status: "refunded",
        refunded_at: new Date().toISOString(),
        metadata: {
          ...transaction.metadata,
          refund_reason: reason
        }
      })
      .eq("payment_id", payment_id);

    if (updateError) {
      console.error("Error updating transaction:", updateError);
    }

    return NextResponse.json({
      success: true,
      message: "Refund processed successfully",
      payment_id
    });
  } catch (error: any) {
    console.error("Refund error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

