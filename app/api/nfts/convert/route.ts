import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nft_id, user_email, telegram_id, wallet_address } = body;

    if (!nft_id) {
      return NextResponse.json(
        { error: "NFT ID required" },
        { status: 400 }
      );
    }

    // Get NFT info
    const { data: nft, error: nftError } = await supabase
      .from("user_nfts")
      .select(`
        *,
        nft_catalog (*)
      `)
      .eq("id", nft_id)
      .eq("status", "active")
      .single();

    if (nftError || !nft) {
      return NextResponse.json(
        { error: "NFT not found or already converted" },
        { status: 404 }
      );
    }

    // Verify ownership
    const isOwner =
      (user_email && nft.user_email === user_email) ||
      (telegram_id && nft.telegram_id === telegram_id) ||
      (wallet_address && nft.wallet_address === wallet_address);

    if (!isOwner) {
      return NextResponse.json(
        { error: "Not the owner of this NFT" },
        { status: 403 }
      );
    }

    // Check if NFT is convertible
    if (!nft.nft_catalog.convertible_to_aia) {
      return NextResponse.json(
        { error: "This NFT cannot be converted to AIA" },
        { status: 400 }
      );
    }

    const aiaValue = nft.nft_catalog.aia_value;

    if (!aiaValue || aiaValue <= 0) {
      return NextResponse.json(
        { error: "Invalid AIA conversion value" },
        { status: 400 }
      );
    }

    // Update NFT status to converted
    const { error: updateError } = await supabase
      .from("user_nfts")
      .update({
        status: "converted",
        converted_at: new Date().toISOString(),
        aia_received: aiaValue
      })
      .eq("id", nft_id);

    if (updateError) {
      console.error("Error updating NFT:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Add AIA to user's balance
    let balanceQuery = supabase.from("user_rewards").select("*");
    if (user_email) balanceQuery = balanceQuery.eq("email", user_email);
    else if (telegram_id) balanceQuery = balanceQuery.eq("telegram_id", telegram_id);
    else balanceQuery = balanceQuery.eq("wallet_address", wallet_address);

    const { data: currentBalance } = await balanceQuery.single();

    const newAiaBalance = (currentBalance?.aia_balance || 0) + aiaValue;

    // Upsert user rewards
    const rewardData: any = {
      aia_balance: newAiaBalance,
      updated_at: new Date().toISOString()
    };

    if (user_email) rewardData.email = user_email;
    if (telegram_id) rewardData.telegram_id = telegram_id;
    if (wallet_address) rewardData.wallet_address = wallet_address;

    const { error: balanceError } = await supabase
      .from("user_rewards")
      .upsert([rewardData], {
        onConflict: user_email ? "email" : telegram_id ? "telegram_id" : "wallet_address"
      });

    if (balanceError) {
      console.error("Error updating balance:", balanceError);
      return NextResponse.json({ error: balanceError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      aia_received: aiaValue,
      new_aia_balance: newAiaBalance,
      message: `Successfully converted ${nft.nft_catalog.name} to ${aiaValue} AIA!`
    });
  } catch (error: any) {
    console.error("Error in convert NFT endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
