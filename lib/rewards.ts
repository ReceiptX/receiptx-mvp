import { supabaseService } from './supabaseServiceClient';

type AwardArgs = {
  userId: string;
  receiptId: string;
  totalAmount?: number;
};

export async function awardRewardsForReceipt(args: AwardArgs) {
  const { receiptId, userId, totalAmount } = args;
  if (!receiptId) throw new Error('receiptId required');
  if (!userId) throw new Error('userId required');

  // Enqueue a job that the worker will pick up and run the heavy reward logic.
  const job = {
    job_type: 'reward.process_receipt',
    status: 'pending',
    attempts: 0,
    scheduled_at: new Date().toISOString(),
    payload: {
      receipt_id: receiptId,
      user_id: userId,
      total_amount: totalAmount ?? null,
    },
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseService.from('jobs').insert(job).select().maybeSingle();
  if (error) {
    throw error;
  }

  return data;
}

export default { awardRewardsForReceipt };
