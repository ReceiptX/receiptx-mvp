import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/referrals/stats?user_email=...&telegram_id=...&wallet_address=...
 * Get referral statistics for a user
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

    // Get referral stats using the database function
    const { data: stats, error: statsError } = await supabase
      .rpc('get_user_referral_stats', {
        p_user_email: user_email,
        p_telegram_id: telegram_id,
        p_wallet_address: wallet_address
      });

    if (statsError) {
      return NextResponse.json(
        { success: false, error: statsError.message },
        { status: 500 }
      );
    }

    // Get detailed referral list
    const { data: referrals, error: referralsError } = await supabase
      .rpc('get_user_referrals', {
        p_user_email: user_email,
        p_telegram_id: telegram_id,
        p_wallet_address: wallet_address
      });

    if (referralsError) {
      return NextResponse.json(
        { success: false, error: referralsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stats: stats?.[0] || {
        total_referrals: 0,
        qualified_referrals: 0,
        rewarded_referrals: 0,
        total_aia_earned: 0,
        pending_referrals: 0
      },
      referrals: referrals || []
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
