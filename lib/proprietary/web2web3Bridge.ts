import { supabaseService } from '../supabaseServiceClient';
import { ReceiptXStandardReceipt } from './adapters/shopify';

type BridgeInput = {
  event: any;
  normalizedReceipt?: ReceiptXStandardReceipt;
  recordId?: string;
};

class Web2Web3Bridge {
  async transparentTransaction(input: BridgeInput) {
    const bridgeMetadata = {
      platform: input.normalizedReceipt?.platform || input.event?.platform || 'unknown',
      order_id: input.normalizedReceipt?.order_id,
      intent: 'bridge_to_web3',
      received_at: new Date().toISOString(),
    };

    if (input.recordId) {
      try {
        await supabaseService
          .from('business_api_events')
          .update({
            bridge_status: 'queued',
            bridge_metadata: bridgeMetadata,
          })
          .eq('id', input.recordId);
      } catch (error) {
        console.warn('bridge update failed', error);
      }
    }

    return { success: true, metadata: bridgeMetadata };
  }
}

export default new Web2Web3Bridge();
