import { supabaseService } from './supabaseServiceClient';

export async function enqueueWaitlistSignupRewards(userId: string, receiptId?: string | null) {
  await supabaseService.from('reward_jobs').insert({
    user_id: userId,
    receipt_id: receiptId ?? null,
    job_type: 'waitlist_signup',
    payload: {},
  });
}

export async function enqueueReferralRewards(referredUserId: string, hasMultiplier: boolean) {
  await supabaseService.from('reward_jobs').insert({
    user_id: referredUserId,
    job_type: 'referral_reward',
    payload: { hasMultiplier },
  });
}

// Compatibility wrappers expected by existing routes (award* naming)
export async function awardWaitlistSignup(userId: string) {
  return enqueueWaitlistSignupRewards(userId);
}

export async function awardReferralIfAny(userId: string, hasMultiplier: boolean) {
  return enqueueReferralRewards(userId, hasMultiplier);
}

export async function processRewardJob(job: any) {
  const { id, user_id, receipt_id, job_type, payload } = job;

  if (job_type === 'waitlist_signup') {
    // Count waitlist entries
    const { count } = await supabaseService
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (typeof count === 'number' && count <= 5000) {
      // 1000 RWT
      await supabaseService.from('rwt_transactions').insert({
        user_id: user_id,
        amount: 1000,
        source: 'waitlist_signup',
      });

      await supabaseService.from('reward_logs').insert({
        user_id: user_id,
        reward_type: 'RWT',
        amount: 1000,
        reason: 'waitlist_signup',
        metadata: { job_id: id, receipt_id },
      });

      // 5 AIA
      await supabaseService.from('aia_transactions').insert({
        user_id: user_id,
        amount: 5,
        source: 'waitlist_signup',
      });

      await supabaseService.from('reward_logs').insert({
        user_id: user_id,
        reward_type: 'AIA',
        amount: 5,
        reason: 'waitlist_signup',
        metadata: { job_id: id, receipt_id },
      });
    }
  }

  if (job_type === 'referral_reward') {
    const hasMultiplier = !!payload?.hasMultiplier;

    // Find waitlist entry for referred user
    const { data: wl } = await supabaseService
      .from('waitlist')
      .select('referred_by')
      .eq('user_id', user_id)
      .single();

    if (!wl?.referred_by) return;

    const { data: referrer } = await supabaseService
      .from('waitlist')
      .select('user_id')
      .eq('referral_code', wl.referred_by)
      .single();

    if (!referrer) return;

    const reward = hasMultiplier ? 10 : 5;

    await supabaseService.from('aia_transactions').insert({
      user_id: referrer.user_id,
      amount: reward,
      source: hasMultiplier ? 'referral_multiplier' : 'referral_standard',
    });

    await supabaseService.from('reward_logs').insert({
      user_id: referrer.user_id,
      reward_type: 'AIA',
      amount: reward,
      reason: hasMultiplier ? 'referral_multiplier' : 'referral_standard',
      metadata: { job_id: id, referred_user_id: user_id },
    });
  }
}

export default {
  enqueueWaitlistSignupRewards,
  enqueueReferralRewards,
  awardWaitlistSignup,
  awardReferralIfAny,
  processRewardJob,
};
