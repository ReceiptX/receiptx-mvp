/**
 * Square POS Adapter
 * Transforms Square payment/order webhooks into ReceiptX standard format
 */

import { ReceiptXStandardReceipt } from './shopify';

export interface SquareOrder {
  id: string;
  location_id: string;
  created_at: string;
  total_money: {
    amount: number;
    currency: string;
  };
  line_items?: Array<{
    name: string;
    quantity: string;
    base_price_money: {
      amount: number;
    };
  }>;
  customer_id?: string;
}

export interface SquarePayment {
  id: string;
  order_id?: string;
  amount_money: {
    amount: number;
    currency: string;
  };
  created_at: string;
  receipt_url?: string;
  customer_id?: string;
}

export class SquareAdapter {
  static transformOrder(squareOrder: SquareOrder): ReceiptXStandardReceipt {
    return {
      platform: 'square',
      order_id: `square_${squareOrder.id}`,
      total_amount: squareOrder.total_money.amount / 100, // Square uses cents
      currency: squareOrder.total_money.currency,
      timestamp: squareOrder.created_at,
      customer_email: undefined, // Square doesn't include in webhook
      line_items: (squareOrder.line_items || []).map(item => ({
        name: item.name,
        quantity: parseInt(item.quantity),
        price: item.base_price_money.amount / 100,
      })),
      metadata: {
        location_id: squareOrder.location_id,
        customer_id: squareOrder.customer_id,
        raw_order: squareOrder,
      },
    };
  }

  static transformPayment(squarePayment: SquarePayment): ReceiptXStandardReceipt {
    return {
      platform: 'square',
      order_id: `square_payment_${squarePayment.id}`,
      total_amount: squarePayment.amount_money.amount / 100,
      currency: squarePayment.amount_money.currency,
      timestamp: squarePayment.created_at,
      line_items: [], // Payments don't include line items
      metadata: {
        payment_id: squarePayment.id,
        order_id: squarePayment.order_id,
        receipt_url: squarePayment.receipt_url,
        customer_id: squarePayment.customer_id,
        raw_payment: squarePayment,
      },
    };
  }

  static validate(webhook: any): boolean {
    return !!(
      webhook.id &&
      (webhook.total_money || webhook.amount_money)
    );
  }
}
