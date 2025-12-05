import { supabaseService } from '../supabaseServiceClient';
import { BASE_RWT_PER_CURRENCY_UNIT } from '../multipliers';
import { ReceiptXStandardReceipt } from './adapters/shopify';

type DistributionInput = {
  recordId?: string;
  normalizedReceipt?: ReceiptXStandardReceipt;
  multiplier?: number;
};

class TokenDistributor {
  async distribute(trigger: DistributionInput) {
    const amount = Number(trigger.normalizedReceipt?.total_amount || 0);
    const multiplier = Number(trigger.multiplier || trigger.normalizedReceipt?.metadata?.multiplier || 1) || 1;

    const base_rwt = Math.max(0, Math.round(amount * BASE_RWT_PER_CURRENCY_UNIT));
    const total_rwt = Math.max(0, Math.round(base_rwt * multiplier));

    const summary = {
      success: true,
      base_rwt,
      multiplier,
      total_rwt,
      currency: trigger.normalizedReceipt?.currency || 'USD',
    };

    if (trigger.recordId) {
      try {
        await supabaseService
          .from('business_api_events')
          .update({
            reward_summary: summary,
            status: 'distributed',
          })
          .eq('id', trigger.recordId);
      } catch (error) {
        console.warn('reward update failed', error);
      }
    }

    return summary;
  }
}

export default new TokenDistributor();
