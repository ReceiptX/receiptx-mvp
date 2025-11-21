import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const telegram_id = searchParams.get("telegram_id");
    const wallet_address = searchParams.get("wallet_address");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!email && !telegram_id && !wallet_address) {
      return NextResponse.json(
        { error: "Email, telegram_id, or wallet_address required" },
        { status: 400 }
      );
    }

    // Build query conditions
    let query = supabase
      .from("receipts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (email) {
      query = query.eq("user_email", email);
    } else if (telegram_id) {
      query = query.eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      query = query.eq("wallet_address", wallet_address);
    }

    const { data: receipts, error } = await query;

    if (error) {
      console.error("Error fetching receipts:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      receipts: receipts || [],
      count: receipts?.length || 0
    });
  } catch (error: any) {
    console.error("Error in receipts history endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
