import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";

/**
 * POST /api/referrals/track
 * Track a new referral when someone signs up with a referral code
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      referral_code,
      referred_email,
      referred_telegram_id,
      referred_wallet_address 
    } = body;

    if (!referral_code) {
      return NextResponse.json(
        { success: false, error: "Referral code required" },
        { status: 400 }
      );
    }

    // At least one referred user identifier required
    if (!referred_email && !referred_telegram_id && !referred_wallet_address) {
      return NextResponse.json(
        { success: false, error: "At least one user identifier required" },
        { status: 400 }
      );
    }

    // Check if this user was already referred
    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("id")
      .or(`referred_email.eq.${referred_email || 'null'},referred_telegram_id.eq.${referred_telegram_id || 'null'},referred_wallet_address.eq.${referred_wallet_address}`)
      .limit(1);

    if (existingReferral && existingReferral.length > 0) {
      return NextResponse.json({
        success: true,
        message: "User already has a referral tracked",
        already_referred: true
      });
    }

    // Find the referrer by referral code (we need to look up who owns this code)
    // For now, we'll create a pending referral that will be completed when they upload a receipt
    const { data: insertData, error: insertError } = await supabase
      .from("referrals")
      .insert({
        referral_code,
        referred_email,
        referred_telegram_id,
        referred_wallet_address,
        status: 'pending'
      })
      .select();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      referral_id: insertData[0].id,
      message: "Referral tracked! Bonus will be paid when you upload your first verified receipt."
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
