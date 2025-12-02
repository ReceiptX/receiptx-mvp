import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServiceClient';

export const runtime = 'nodejs';

/**
 * POST /api/rewards/create-waitlist-reward
 * Manually create waitlist reward job for existing user (admin/recovery endpoint)
 * Body: { user_id: string } or { email: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, email } = body;

    if (!user_id && !email) {
      return NextResponse.json(
        { success: false, error: 'user_id or email required' },
        { status: 400 }
      );
    }

    // Find user
    let userId = user_id;
    if (!userId && email) {
      const { data: user, error } = await supabaseService
        .from('users')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();

      if (error || !user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      userId = user.id;
    }

    console.log('💰 Issuing waitlist rewards for user_id:', userId);

    // Check if rewards already issued
    const { data: existingRWT, error: checkError } = await supabaseService
      .from('rwt_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('source', 'waitlist_signup')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing rewards:', checkError);
      return NextResponse.json(
        { success: false, error: checkError.message },
        { status: 500 }
      );
    }

    if (existingRWT) {
      return NextResponse.json({
        success: true,
        message: 'Rewards already issued for this user',
        already_issued: true,
      });
    }

    // Issue rewards directly
    const { issueWaitlistSignupRewards } = await import('@/lib/rewardsWaitlistDirect');
    
    try {
      const result = await issueWaitlistSignupRewards(userId);

      if (!result.success) {
        throw new Error(result.reason || 'Unknown error');
      }

      console.log('✅ Rewards issued successfully');

      return NextResponse.json({
        success: true,
        message: 'Waitlist rewards issued successfully',
        rewards: { rwt: result.rwt, aia: result.aia },
      });
    } catch (processError: any) {
      console.error('Error issuing rewards:', processError);

      return NextResponse.json(
        { 
          success: false, 
          error: 'Reward issuance failed',
          details: processError.message 
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Create waitlist reward error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
