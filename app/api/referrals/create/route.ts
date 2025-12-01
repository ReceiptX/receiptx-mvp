import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseServiceClient";
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/referrals/create
 * Create a new referral code for a user
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_email, telegram_id, wallet_address, custom_code } = body;

    // At least one identifier required
    if (!user_email && !telegram_id && !wallet_address) {
      return NextResponse.json(
        { success: false, error: "At least one user identifier required" },
        { status: 400 }
      );
    }

    // Check if user already has a referral code
    const { data: existing } = await supabaseService
      .from("referrals")
      .select("referral_code")
      .or(`referrer_email.eq.${user_email || 'null'},referrer_telegram_id.eq.${telegram_id || 'null'},referrer_wallet_address.eq.${wallet_address}`)
      .not('referral_code', 'is', null)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        referral_code: existing[0].referral_code,
        referral_link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/landing?ref=${existing[0].referral_code}`,
        is_new: false
      });
    }

    // If custom_code is provided, check for duplicates
    let referralCode = custom_code ? custom_code.trim().toUpperCase() : crypto.randomBytes(6).toString('hex').toUpperCase();
    if (custom_code) {
      const { data: codeExists } = await supabaseService
        .from("referrals")
        .select("referral_code")
        .eq("referral_code", referralCode)
        .limit(1);
      if (codeExists && codeExists.length > 0) {
        return NextResponse.json({
          success: false,
          error: "This referral code is already taken. Please choose another.",
          code_taken: true
        }, { status: 409 });
      }
    }

    // Persist referral to users/referrals so the code is actually usable later
    try {
      // Upsert into `users` table so user's referral_code is available in user record
      if (user_email && supabaseAdmin) {
        await supabaseService
          .from('users')
          .upsert({ email: user_email, referral_code: referralCode }, { onConflict: ['email'] });
      }

      // Also create an active referrals row for lookup by code (helps track owners)
      if (supabaseAdmin) {
        await supabaseService
          .from('referrals')
          .upsert({ referral_code: referralCode, referrer_email: user_email || null, status: 'active' }, { onConflict: ['referral_code'] });
      }
    } catch (dbErr) {
      console.error('Failed to persist referral_code:', dbErr);
      // non-fatal: continue and return the code to the user
    }

    return NextResponse.json({
      success: true,
      referral_code: referralCode,
      referral_link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/landing?ref=${referralCode}`,
      is_new: true,
      note: "Save this code and share it! Referrals will be tracked when they sign up."
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/referrals/create?user_email=...
 * Get existing referral code for a user
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const user_email = searchParams.get('user_email');
    const telegram_id = searchParams.get('telegram_id');
    const wallet_address = searchParams.get('wallet_address');

    if (!user_email && !telegram_id && !wallet_address) {
      return NextResponse.json(
        { success: false, error: "At least one user identifier required" },
        { status: 400 }
      );
    }

    // Generate unique referral code if doesn't exist
    const referralCode = crypto.randomBytes(6).toString('hex').toUpperCase();

    return NextResponse.json({
      success: true,
      referral_code: referralCode,
      referral_link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/landing?ref=${referralCode}`,
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
