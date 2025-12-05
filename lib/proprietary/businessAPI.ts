import { supabaseService } from '../supabaseServiceClient';
import { ShopifyAdapter, ReceiptXStandardReceipt } from './adapters/shopify';
import { SquareAdapter } from './adapters/square';
import { StripeAdapter } from './adapters/stripe';
import { CloverAdapter } from './adapters/clover';
import { ToastAdapter } from './adapters/toast';

type SupportedPlatform = 'shopify' | 'square' | 'stripe' | 'clover' | 'toast' | 'unknown';

type HandleResult = {
  normalizedReceipt: ReceiptXStandardReceipt;
  recordId: string;
  platform: SupportedPlatform;
};

class ReceiptXBusinessAPI {
  private adapters = {
    shopify: ShopifyAdapter,
    square: SquareAdapter,
    stripe: StripeAdapter,
    clover: CloverAdapter,
    toast: ToastAdapter,
  } as const;

  async initialize(_config: unknown) {
    return { success: true, supported: this.getSupportedPlatforms() };
  }

  private detectPlatform(event: any): SupportedPlatform {
    const hint = (event?.platform || event?.source || '').toString().toLowerCase();
    if (hint && hint in this.adapters) return hint as SupportedPlatform;

    if (ShopifyAdapter.validate(event)) return 'shopify';
    if (SquareAdapter.validate(event)) return 'square';
    if (StripeAdapter.validate(event)) return 'stripe';
    if (CloverAdapter.validate(event)) return 'clover';
    if (ToastAdapter.validate(event)) return 'toast';
    return 'unknown';
  }

  private normalizeEvent(event: any, platform: SupportedPlatform): ReceiptXStandardReceipt {
    const adapter = platform !== 'unknown' ? (this.adapters as any)[platform] : null;
    if (adapter && adapter.validate(event)) {
      return adapter.transform(event);
    }

    const total =
      typeof event.total === 'number'
        ? event.total
        : typeof event.amount === 'number'
          ? event.amount
          : Number(event.total_amount || 0);

    return {
      platform,
      order_id: event.id || event.order_id || `unknown_${Date.now()}`,
      total_amount: Number.isFinite(total) ? total : 0,
      currency: event.currency || 'USD',
      timestamp: event.timestamp || new Date().toISOString(),
      customer_email: event.customer_email || event.email,
      customer_phone: event.customer_phone || event.phone,
      customer_name: event.customer_name || event.name,
      line_items: Array.isArray(event.line_items)
        ? event.line_items.map((item: any, idx: number) => ({
            name: item.name || `item_${idx + 1}`,
            quantity: Number(item.quantity || 1),
            price: Number(item.price || 0),
          }))
        : [],
      metadata: {
        business: event.business_name || event.company || event.brand,
        raw_event: event,
      },
    };
  }

  private async recordEvent(platform: SupportedPlatform, normalized: ReceiptXStandardReceipt, rawEvent: any) {
    const { data, error } = await supabaseService
      .from('business_api_events')
      .insert({
        platform,
        business_name:
          rawEvent.business_name ||
          rawEvent.company ||
          rawEvent.brand ||
          normalized.metadata?.business ||
          'Unknown',
        external_id: normalized.order_id,
        normalized_receipt: normalized,
        raw_event: rawEvent,
        detected_brand: rawEvent.brand || normalized.metadata?.business || null,
        total_amount: normalized.total_amount,
        currency: normalized.currency,
        customer_email: normalized.customer_email || null,
        status: 'normalized',
      })
      .select()
      .single();

    if (error) {
      console.error('business_api_events insert failed', error);
      throw new Error('Failed to persist business event');
    }

    return data;
  }

  async handleBusinessEvent(event: any): Promise<HandleResult> {
    const platform = this.detectPlatform(event);
    const normalizedReceipt = this.normalizeEvent(event, platform);
    const record = await this.recordEvent(platform, normalizedReceipt, event);

    return {
      normalizedReceipt,
      recordId: record.id,
      platform,
    };
  }

  getSupportedPlatforms(): string[] {
    return Object.keys(this.adapters);
  }
}

export default new ReceiptXBusinessAPI();

