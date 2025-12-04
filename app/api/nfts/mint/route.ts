import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_email, telegram_id, wallet_address, nft_type } = body;

    if (!user_email && !telegram_id && !wallet_address) {
      return NextResponse.json(
        { error: "User identifier required" },
        { status: 400 }
      );
    }

    if (!nft_type) {
      return NextResponse.json(
        { error: "NFT type required" },
        { status: 400 }
      );
    }

    // Get NFT catalog info
    const { data: nftInfo, error: catalogError } = await supabase
      .from("nft_catalog")
      .select("*")
      .eq("nft_type", nft_type)
      .single();

    if (catalogError || !nftInfo) {
      return NextResponse.json(
        { error: "NFT type not found in catalog" },
        { status: 404 }
      );
    }

    // Check if user already has this NFT
    let checkQuery = supabase
      .from("user_nfts")
      .select("*")
      .eq("nft_type", nft_type)
      .eq("status", "active");

    if (user_email) checkQuery = checkQuery.eq("user_email", user_email);
    else if (telegram_id) checkQuery = checkQuery.eq("telegram_id", telegram_id);
    else checkQuery = checkQuery.eq("wallet_address", wallet_address);

    const { data: existing } = await checkQuery;

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "User already owns this NFT" },
        { status: 400 }
      );
    }

    // Get user's receipt count for verification
    let receiptQuery = supabase.from("receipts").select("id");
    if (user_email) receiptQuery = receiptQuery.eq("user_email", user_email);
    else if (telegram_id) receiptQuery = receiptQuery.eq("telegram_id", telegram_id);
    else receiptQuery = receiptQuery.eq("wallet_address", wallet_address);

    const { data: receipts } = await receiptQuery;
    const receiptCount = receipts?.length || 0;

    // Verify eligibility
    if (receiptCount < nftInfo.required_receipts) {
      return NextResponse.json(
        {
          error: "Not eligible for this NFT",
          current_receipts: receiptCount,
          required_receipts: nftInfo.required_receipts
        },
        { status: 400 }
      );
    }

    // Mint NFT (create record)
    const nftData = {
      user_email,
      telegram_id,
      wallet_address,
      nft_type,
      status: "active",
      metadata: {
        receipts_at_mint: receiptCount,
        minted_timestamp: new Date().toISOString(),
        tier: nftInfo.tier,
        rarity: nftInfo.rarity
      }
    };

    const { data: mintedNFT, error: mintError } = await supabase
      .from("user_nfts")
      .insert([nftData])
      .select()
      .single();

    if (mintError) {
      console.error("Error minting NFT:", mintError);
      return NextResponse.json({ error: mintError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      nft: mintedNFT,
      nft_info: nftInfo,
      message: `Congratulations! You've earned the ${nftInfo.name}!`
    });
  } catch (error: any) {
    console.error("Error in mint NFT endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Check NFT eligibility
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const telegram_id = searchParams.get("telegram_id");
    const wallet_address = searchParams.get("wallet_address");

    if (!email && !telegram_id && !wallet_address) {
      return NextResponse.json(
        { error: "User identifier required" },
        { status: 400 }
      );
    }

    // Call Supabase function to check eligibility
    const { data, error } = await supabase.rpc("check_tier_nft_eligibility", {
      p_user_email: email,
      p_telegram_id: telegram_id,
      p_wallet_address: wallet_address
    });

    if (error) {
      console.error("Error checking eligibility:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      eligibility: data || [],
      eligible_count: data?.filter((nft: any) => nft.is_eligible).length || 0
    });
  } catch (error: any) {
    console.error("Error in NFT eligibility endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

