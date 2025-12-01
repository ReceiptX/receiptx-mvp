import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServiceClient';
import { processRewardJob } from '@/lib/rewardsWaitlist';

export const runtime = 'nodejs';

export async function POST() {
  const { data: jobs, error } = await supabaseService
    .from('reward_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Error fetching jobs', error);
    return NextResponse.json({ error: 'Error fetching jobs' }, { status: 500 });
  }

  for (const job of jobs ?? []) {
    try {
      await supabaseService
        .from('reward_jobs')
        .update({ status: 'processing', attempts: job.attempts + 1 })
        .eq('id', job.id);

      await processRewardJob(job);

      await supabaseService
        .from('reward_jobs')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', job.id);
    } catch (e: any) {
      console.error('Error processing job', job.id, e);
      await supabaseService
        .from('reward_jobs')
        .update({
          status: job.attempts >= 5 ? 'failed' : 'pending',
          last_error: String(e?.message ?? e),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }
  }

  return NextResponse.json({ ok: true, processed: jobs?.length ?? 0 });
}

export default { POST };
