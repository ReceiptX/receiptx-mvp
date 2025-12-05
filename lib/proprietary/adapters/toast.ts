/**
 * Toast POS Adapter (Restaurant-focused)
 * Transforms Toast order webhooks into ReceiptX standard format
 */

import { ReceiptXStandardReceipt } from './shopify';

export interface ToastCheck {
  guid: string;
  entityType: string;
  createdDate: string;
  modifiedDate: string;
  amount: number; // In cents
  taxAmount?: number;
  totalAmount: number; // In cents
  selections?: Array<{
    itemGroup: {
      name: string;
    };
    item: {
      name: string;
    };
    quantity: number;
    preDiscountPrice: number;
  }>;
  customer?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  };
}

export class ToastAdapter {
  static transform(toastCheck: ToastCheck): ReceiptXStandardReceipt {
    const customerName = toastCheck.customer
      ? `${toastCheck.customer.firstName || ''} ${toastCheck.customer.lastName || ''}`.trim()
      : undefined;

    return {
      platform: 'toast',
      order_id: `toast_${toastCheck.guid}`,
      total_amount: toastCheck.totalAmount / 100,
      currency: 'USD', // Toast is US-only
      timestamp: toastCheck.createdDate,
      customer_email: toastCheck.customer?.email,
      customer_phone: toastCheck.customer?.phone,
      customer_name: customerName,
      line_items: (toastCheck.selections || []).map(selection => ({
        name: selection.item.name,
        quantity: selection.quantity,
        price: selection.preDiscountPrice / 100,
      })),
      metadata: {
        entity_type: toastCheck.entityType,
        tax_amount: toastCheck.taxAmount ? toastCheck.taxAmount / 100 : 0,
        modified_date: toastCheck.modifiedDate,
        raw_check: toastCheck,
      },
    };
  }

  static validate(webhook: any): boolean {
    return !!(
      webhook.guid &&
      webhook.totalAmount &&
      webhook.entityType === 'Check'
    );
  }
}
