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

    console.log('💰 Creating waitlist reward job for user_id:', userId);

    // Check if job already exists
    const { data: existingJob, error: checkError } = await supabaseService
      .from('reward_jobs')
      .select('id, status')
      .eq('user_id', userId)
      .eq('job_type', 'waitlist_signup')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing jobs:', checkError);
      return NextResponse.json(
        { success: false, error: checkError.message },
        { status: 500 }
      );
    }

    if (existingJob) {
      return NextResponse.json({
        success: true,
        message: 'Reward job already exists',
        job_id: existingJob.id,
        status: existingJob.status,
      });
    }

    // Create reward job
    const { data: job, error: jobError } = await supabaseService
      .from('reward_jobs')
      .insert({
        user_id: userId,
        job_type: 'waitlist_signup',
        payload: {},
        status: 'pending',
      })
      .select('id')
      .single();

    if (jobError) {
      console.error('Error creating reward job:', jobError);
      return NextResponse.json(
        { success: false, error: jobError.message },
        { status: 500 }
      );
    }

    console.log('✅ Reward job created:', job.id);

    // Process the job immediately
    const { processRewardJob } = await import('@/lib/rewardsWaitlist');
    
    try {
      await processRewardJob({
        id: job.id,
        user_id: userId,
        job_type: 'waitlist_signup',
        payload: {},
      });

      // Mark job as completed
      await supabaseService
        .from('reward_jobs')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', job.id);

      console.log('✅ Reward job processed successfully');

      return NextResponse.json({
        success: true,
        message: 'Waitlist reward issued successfully',
        job_id: job.id,
        rewards: { rwt: 1000, aia: 5 },
      });
    } catch (processError: any) {
      console.error('Error processing reward job:', processError);

      // Mark job as failed
      await supabaseService
        .from('reward_jobs')
        .update({ 
          status: 'failed', 
          last_error: processError.message,
          updated_at: new Date().toISOString() 
        })
        .eq('id', job.id);

      return NextResponse.json(
        { 
          success: false, 
          error: 'Job created but processing failed',
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
