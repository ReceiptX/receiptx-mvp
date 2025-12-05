/**
 * Shopify POS Adapter
 * Transforms Shopify order webhooks into ReceiptX standard format
 */

export interface ShopifyOrder {
  id: number;
  order_number: string;
  email?: string;
  total_price: string;
  currency: string;
  created_at: string;
  line_items: Array<{
    title: string;
    quantity: number;
    price: string;
  }>;
  customer?: {
    email?: string;
    phone?: string;
  };
  billing_address?: {
    name?: string;
  };
}

export interface ReceiptXStandardReceipt {
  platform: string;
  order_id: string;
  total_amount: number;
  currency: string;
  timestamp: string;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  line_items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  metadata: any;
}

export class ShopifyAdapter {
  static transform(shopifyOrder: ShopifyOrder): ReceiptXStandardReceipt {
    return {
      platform: 'shopify',
      order_id: `shopify_${shopifyOrder.id}`,
      total_amount: parseFloat(shopifyOrder.total_price),
      currency: shopifyOrder.currency,
      timestamp: shopifyOrder.created_at,
      customer_email: shopifyOrder.customer?.email || shopifyOrder.email,
      customer_phone: shopifyOrder.customer?.phone,
      customer_name: shopifyOrder.billing_address?.name,
      line_items: shopifyOrder.line_items.map(item => ({
        name: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
      })),
      metadata: {
        order_number: shopifyOrder.order_number,
        raw_order: shopifyOrder,
      },
    };
  }

  static validate(webhook: any): boolean {
    return !!(
      webhook.id &&
      webhook.total_price &&
      webhook.line_items &&
      Array.isArray(webhook.line_items)
    );
  }
}
