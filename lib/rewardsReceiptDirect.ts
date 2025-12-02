/**
 * Direct reward issuance for receipt processing
 * This module bypasses the job queue and inserts transactions directly into the database
 */

import { supabaseService } from './supabaseServiceClient';

export interface ReceiptRewardParams {
  userId: string;
  receiptId: string;
  rwtAmount: number;
  aiaAmount: number;
  brand?: string;
  multiplier?: number;
  baseRWT?: number;
}

/**
 * Issue RWT and AIA rewards for a processed receipt
 * Inserts directly into rwt_transactions and aia_transactions tables
 */
export async function issueReceiptReward(params: ReceiptRewardParams) {
  const { userId, receiptId, rwtAmount, aiaAmount, brand, multiplier, baseRWT } = params;

  console.log(`[Direct Receipt Reward] Issuing rewards for receipt ${receiptId}:`, {
    userId,
    rwtAmount,
    aiaAmount,
    brand,
    multiplier
  });

  try {
    // 1. Insert RWT transaction
    if (rwtAmount > 0) {
      const { error: rwtError } = await supabaseService
        .from('rwt_transactions')
        .insert({
          user_id: userId,
          amount: rwtAmount,
          source: `receipt_${receiptId}`,
          direction: 'credit',
          metadata: {
            receipt_id: receiptId,
            brand,
            multiplier,
            base_rwt: baseRWT
          }
        });

      if (rwtError) {
        console.error('[Direct Receipt Reward] Failed to insert RWT transaction:', rwtError);
        throw new Error(`Failed to credit RWT: ${rwtError.message}`);
      }

      console.log(`✅ ${rwtAmount} RWT credited for receipt ${receiptId}`);
    }

    // 2. Insert AIA transaction (if any - receipts may earn AIA for analytics)
    if (aiaAmount > 0) {
      const { error: aiaError } = await supabaseService
        .from('aia_transactions')
        .insert({
          user_id: userId,
          amount: aiaAmount,
          source: `receipt_${receiptId}`,
          direction: 'credit',
          metadata: {
            receipt_id: receiptId,
            brand
          }
        });

      if (aiaError) {
        console.error('[Direct Receipt Reward] Failed to insert AIA transaction:', aiaError);
        throw new Error(`Failed to credit AIA: ${aiaError.message}`);
      }

      console.log(`✅ ${aiaAmount} AIA credited for receipt ${receiptId}`);
    }

    // 3. Log to reward_logs for audit trail
    const { error: logError } = await supabaseService
      .from('reward_logs')
      .insert({
        user_id: userId,
        action: 'receipt_processed',
        rwt_amount: rwtAmount,
        aia_amount: aiaAmount,
        details: {
          receipt_id: receiptId,
          brand,
          multiplier,
          base_rwt: baseRWT
        }
      });

    if (logError) {
      console.warn('[Direct Receipt Reward] Failed to log to reward_logs:', logError);
      // Don't throw - logging failure shouldn't fail the reward
    }

    return {
      success: true,
      rwt: rwtAmount,
      aia: aiaAmount
    };
  } catch (error: any) {
    console.error('[Direct Receipt Reward] Error:', error);
    throw error;
  }
}

/**
 * Legacy function - now calls issueReceiptReward directly
 * Kept for backwards compatibility
 */
export async function awardRewardsForReceipt(args: { userId: string; receiptId: string; totalAmount?: number }) {
  // This was the old job queue function - we'll keep the signature but implement directly
  console.warn('[Direct Receipt Reward] awardRewardsForReceipt is deprecated - use issueReceiptReward instead');
  
  // For backwards compatibility, we'll just calculate a basic reward
  const baseRWT = (args.totalAmount || 0) * 10; // Simple multiplier
  
  return issueReceiptReward({
    userId: args.userId,
    receiptId: args.receiptId,
    rwtAmount: baseRWT,
    aiaAmount: 0,
    baseRWT
  });
}

export default {
  issueReceiptReward,
  awardRewardsForReceipt
};
