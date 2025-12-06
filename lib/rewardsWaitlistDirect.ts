import { supabaseService } from './supabaseServiceClient';

/**
 * Directly issue waitlist signup rewards (no job queue)
 * Called immediately during signup to ensure rewards are credited
 */
export async function issueWaitlistSignupRewards(userId: string) {
  try {
    console.log('Issuing waitlist rewards for user_id:', userId);

    // Check waitlist count (first 5000 users get rewards)
    const { count } = await supabaseService
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (typeof count !== 'number' || count > 5000) {
      console.log('Waitlist limit exceeded, no rewards issued');
      return { success: false, reason: 'waitlist_full' };
    }

    // Issue 1000 RWT
    const { error: rwtError } = await supabaseService
      .from('rwt_transactions')
      .insert({
        user_id: userId,
        amount: 1000,
        direction: 'credit',
        source: 'waitlist_signup',
        description: 'Waitlist signup bonus',
      });

    if (rwtError) {
      console.error('RWT transaction failed:', rwtError);
      throw rwtError;
    }

    // Issue 5 AIA
    const { error: aiaError } = await supabaseService
      .from('aia_transactions')
      .insert({
        user_id: userId,
        amount: 5,
        direction: 'credit',
        source: 'waitlist_signup',
        description: 'Waitlist signup bonus',
      });

    if (aiaError) {
      console.error('AIA transaction failed:', aiaError);
      throw aiaError;
    }

    // Log the reward
    await supabaseService.from('reward_logs').insert({
      user_id: userId,
      action: 'waitlist_signup',
      rwt_amount: 1000,
      aia_amount: 5,
      details: { timestamp: new Date().toISOString() },
    });

    // Keep user_stats in sync so balances update instantly
    try {
      const { data: stats } = await supabaseService
        .from('user_stats')
        .select('id,total_rwt_earned,total_aia_earned')
        .eq('user_id', userId)
        .maybeSingle();

      if (stats?.id) {
        await supabaseService
          .from('user_stats')
          .update({
            total_rwt_earned: Number(stats.total_rwt_earned || 0) + 1000,
            total_aia_earned: Number(stats.total_aia_earned || 0) + 5,
          })
          .eq('id', stats.id);
      } else {
        await supabaseService.from('user_stats').insert({
          user_id: userId,
          total_rwt_earned: 1000,
          total_aia_earned: 5,
          total_receipts: 0,
          current_streak: 0,
        });
      }
    } catch (statsError) {
      console.warn('user_stats update skipped:', statsError);
    }

    console.log('Waitlist rewards issued successfully');
    return { success: true, rwt: 1000, aia: 5 };
  } catch (error: any) {
    console.error('Failed to issue waitlist rewards:', error);
    throw error;
  }
}

/**
 * Legacy function - now calls issueWaitlistSignupRewards directly
 */
export async function enqueueWaitlistSignupRewards(userId: string, receiptId?: string | null) {
  return issueWaitlistSignupRewards(userId);
}

/**
 * Issue referral reward (called when someone signs up with a referral code)
 */
export async function issueReferralReward(referrerUserId: string, hasMultiplier: boolean) {
  try {
    const reward = hasMultiplier ? 10 : 5;

    console.log(`Issuing referral reward: ${reward} AIA to user_id:`, referrerUserId);

    const { error: aiaError } = await supabaseService
      .from('aia_transactions')
      .insert({
        user_id: referrerUserId,
        amount: reward,
        direction: 'credit',
        source: hasMultiplier ? 'referral_multiplier' : 'referral_standard',
        description: `Referral bonus (${hasMultiplier ? 'with multiplier' : 'standard'})`,
      });

    if (aiaError) {
      console.error('Referral AIA transaction failed:', aiaError);
      throw aiaError;
    }

    await supabaseService.from('reward_logs').insert({
      user_id: referrerUserId,
      action: hasMultiplier ? 'referral_multiplier' : 'referral_standard',
      rwt_amount: 0,
      aia_amount: reward,
      details: { timestamp: new Date().toISOString() },
    });

    console.log(`Referral reward issued: ${reward} AIA`);
    return { success: true, aia: reward };
  } catch (error: any) {
    console.error('Failed to issue referral reward:', error);
    throw error;
  }
}

/**
 * Legacy function - now calls issueReferralReward directly
 */
export async function enqueueReferralRewards(referredUserId: string, hasMultiplier: boolean) {
  return issueReferralReward(referredUserId, hasMultiplier);
}

// Compatibility exports
export async function awardWaitlistSignup(userId: string) {
  return issueWaitlistSignupRewards(userId);
}

export async function awardReferralIfAny(userId: string, hasMultiplier: boolean) {
  return issueReferralReward(userId, hasMultiplier);
}

export default {
  issueWaitlistSignupRewards,
  enqueueWaitlistSignupRewards,
  issueReferralReward,
  enqueueReferralRewards,
  awardWaitlistSignup,
  awardReferralIfAny,
};
