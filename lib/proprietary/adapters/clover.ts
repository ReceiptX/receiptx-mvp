/**
 * Clover POS Adapter
 * Transforms Clover order webhooks into ReceiptX standard format
 */

import { ReceiptXStandardReceipt } from './shopify';

export interface CloverOrder {
  id: string;
  total: number; // Already in dollars (not cents)
  currency: string;
  createdTime: number; // Unix timestamp in milliseconds
  title?: string;
  lineItems?: {
    elements: Array<{
      name: string;
      price: number;
    }>;
  };
  customers?: {
    elements: Array<{
      emailAddresses?: {
        elements: Array<{
          emailAddress: string;
        }>;
      };
      phoneNumbers?: {
        elements: Array<{
          phoneNumber: string;
        }>;
      };
    }>;
  };
}

export class CloverAdapter {
  static transform(cloverOrder: CloverOrder): ReceiptXStandardReceipt {
    const customer = cloverOrder.customers?.elements?.[0];
    const email = customer?.emailAddresses?.elements?.[0]?.emailAddress;
    const phone = customer?.phoneNumbers?.elements?.[0]?.phoneNumber;

    return {
      platform: 'clover',
      order_id: `clover_${cloverOrder.id}`,
      total_amount: cloverOrder.total / 100, // Clover uses cents
      currency: cloverOrder.currency || 'USD',
      timestamp: new Date(cloverOrder.createdTime).toISOString(),
      customer_email: email,
      customer_phone: phone,
      line_items: (cloverOrder.lineItems?.elements || []).map(item => ({
        name: item.name,
        quantity: 1, // Clover doesn't always provide quantity
        price: item.price / 100,
      })),
      metadata: {
        title: cloverOrder.title,
        raw_order: cloverOrder,
      },
    };
  }

  static validate(webhook: any): boolean {
    return !!(
      webhook.id &&
      webhook.total &&
      typeof webhook.createdTime === 'number'
    );
  }
}
