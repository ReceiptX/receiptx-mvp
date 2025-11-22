/**
 * Stripe Adapter
 * Transforms Stripe payment intents into ReceiptX standard format
 */

import { ReceiptXStandardReceipt } from './shopify';

export interface StripePaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number; // In cents
  currency: string;
  created: number; // Unix timestamp
  description?: string;
  receipt_email?: string;
  metadata?: {
    order_id?: string;
    customer_name?: string;
    items?: string; // JSON stringified array
  };
  charges?: {
    data: Array<{
      receipt_url?: string;
      billing_details?: {
        email?: string;
        name?: string;
        phone?: string;
      };
    }>;
  };
}

export class StripeAdapter {
  static transform(paymentIntent: StripePaymentIntent): ReceiptXStandardReceipt {
    const charge = paymentIntent.charges?.data?.[0];
    const billingDetails = charge?.billing_details;

    // Try to parse line items from metadata
    let lineItems = [];
    if (paymentIntent.metadata?.items) {
      try {
        const items = JSON.parse(paymentIntent.metadata.items);
        lineItems = items.map((item: any) => ({
          name: item.name || item.description,
          quantity: item.quantity || 1,
          price: item.price || 0,
        }));
      } catch (e) {
        // If parsing fails, use description as single line item
        lineItems = [{
          name: paymentIntent.description || 'Payment',
          quantity: 1,
          price: paymentIntent.amount / 100,
        }];
      }
    }

    return {
      platform: 'stripe',
      order_id: `stripe_${paymentIntent.id}`,
      total_amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      timestamp: new Date(paymentIntent.created * 1000).toISOString(),
      customer_email: paymentIntent.receipt_email || billingDetails?.email,
      customer_phone: billingDetails?.phone,
      customer_name: paymentIntent.metadata?.customer_name || billingDetails?.name,
      line_items: lineItems,
      metadata: {
        payment_intent_id: paymentIntent.id,
        description: paymentIntent.description,
        receipt_url: charge?.receipt_url,
        order_id: paymentIntent.metadata?.order_id,
        raw_payment: paymentIntent,
      },
    };
  }

  static validate(webhook: any): boolean {
    return !!(
      webhook.id &&
      webhook.object === 'payment_intent' &&
      webhook.amount &&
      webhook.currency
    );
  }
}
