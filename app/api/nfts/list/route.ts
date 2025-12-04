import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";

// GET: List user's NFTs
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("user_email");
    const telegram_id = searchParams.get("telegram_id");
    const wallet_address = searchParams.get("wallet_address");
    const status = searchParams.get("status") || "active";

    if (!email && !telegram_id && !wallet_address) {
      return NextResponse.json(
        { error: "User identifier required" },
        { status: 400 }
      );
    }

    const client = supabaseAdmin;
    if (!client) {
      console.error("Supabase service role client unavailable in nfts/list");
      return NextResponse.json({ error: "Service configuration error" }, { status: 500 });
    }

    // Build query using service-role client for privileged access to NFT catalog joins
    let query = client
      .from("user_nfts")
      .select(`
        *,
        nft_catalog (*)
      `)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (email) query = query.eq("user_email", email as string);
    else if (telegram_id) query = query.eq("telegram_id", telegram_id as string);
    else query = query.eq("wallet_address", wallet_address as string);

    const { data: nfts, error } = await query;

    if (error) {
      console.error("Error fetching NFTs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      nfts: nfts || [],
      count: nfts?.length || 0
    });
  } catch (error: any) {
    console.error("Error in list NFTs endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

