// ============================================================
// Cashfree Payment Gateway Adapter
// Implements IPaymentGatewayAdapter for Cashfree using REST API
// ============================================================

import { IPaymentGatewayAdapter } from '../gateway-adapter';
import {
  CreateOrderParams,
  CreateOrderResult,
  PaymentStatusResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  WebhookEvent,
  ProcessWebhookResult,
  RefundParams,
  RefundResult,
  PaymentMethod,
  PaymentStatus,
} from '../types';

export class CashfreeAdapter implements IPaymentGatewayAdapter {
  private appId: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    const env = process.env.PAYMENT_ENV || 'sandbox';
    const appId = env === 'production'
      ? process.env.CASHFREE_APP_ID
      : process.env.CASHFREE_APP_ID_SANDBOX;
    const secretKey = env === 'production'
      ? process.env.CASHFREE_SECRET_KEY
      : process.env.CASHFREE_SECRET_KEY_SANDBOX;

    // Cashfree is currently unavailable - throw error if credentials are not configured
    // This prevents the system from attempting to use Cashfree when it's not set up
    if (!appId || !secretKey) {
      throw new Error('Cashfree credentials not configured. Cashfree is currently unavailable for this merchant account.');
    }

    this.appId = appId;
    this.secretKey = secretKey;
    this.baseUrl = env === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': this.appId,
      'x-client-secret': this.secretKey,
    };
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    try {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const request = {
        order_id: orderId,
        order_amount: params.amount,
        order_currency: params.currency,
        customer_details: {
          customer_id: params.customer_phone || 'cust_' + Date.now(),
          customer_name: params.customer_name,
          customer_email: params.customer_email,
          customer_phone: params.customer_phone,
        },
      };

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok || !data.order_id) {
        throw new Error(data.message || 'Failed to create Cashfree order');
      }

      return {
        success: true,
        gateway_order_id: data.order_id,
        checkout_data: {
          order_id: data.order_id,
          order_token: data.order_token,
        },
      };
    } catch (error: any) {
      console.error('[CashfreeAdapter] createOrder error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create order',
      };
    }
  }

  async getPaymentStatus(gateway_order_id: string): Promise<PaymentStatusResult> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${gateway_order_id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to fetch payment status',
        };
      }

      const status = this.mapCashfreeStatus(data.order_status);

      return {
        success: true,
        status,
        gateway_payment_id: data.order_id,
        paid_amount: data.order_amount,
      };
    } catch (error: any) {
      console.error('[CashfreeAdapter] getPaymentStatus error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    const result = await this.getPaymentStatus(params.gateway_order_id);
    return {
      success: result.success,
      status: result.status || 'failed',
      gateway_payment_id: result.gateway_payment_id,
      error: result.error,
    };
  }

  async handleWebhook(event: WebhookEvent): Promise<ProcessWebhookResult> {
    try {
      const payload = event.payload;
      const eventType = payload.data?.payment?.payment_status || payload.event_type;

      let paymentId: string | undefined;
      let status: PaymentStatus | undefined;
      let error: string | undefined;

      if (eventType === 'SUCCESS' || eventType === 'PAYMENT_SUCCESS') {
        status = 'success';
        paymentId = payload.data?.payment?.cf_payment_id;
      } else if (eventType === 'FAILED' || eventType === 'PAYMENT_FAILED') {
        status = 'failed';
        error = payload.data?.payment?.error_description || 'Payment failed';
      }

      if (!status) {
        return {
          success: false,
          error: 'Unhandled webhook event type',
        };
      }

      return {
        success: true,
        payment_id: paymentId,
        status,
        error,
      };
    } catch (error: any) {
      console.error('[CashfreeAdapter] handleWebhook error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async refundPayment(params: RefundParams): Promise<RefundResult> {
    try {
      const refundId = `refund_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const request = {
        refund_amount: params.amount,
        refund_id: refundId,
        refund_note: params.reason || 'Refund',
      };

      const response = await fetch(`${this.baseUrl}/orders/${params.gateway_payment_id}/refunds`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok || !data.refund_id) {
        throw new Error(data.message || 'Failed to create refund');
      }

      return {
        success: true,
        gateway_refund_id: data.refund_id,
      };
    } catch (error: any) {
      console.error('[CashfreeAdapter] refundPayment error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process refund',
      };
    }
  }

  getSupportedPaymentMethods(): PaymentMethod[] {
    return ['upi', 'card', 'netbanking'];
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(payload)
        .digest('base64');
      return signature === expectedSignature;
    } catch {
      return false;
    }
  }

  private mapCashfreeStatus(cashfreeStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'SUCCESS': 'success',
      'FAILED': 'failed',
      'PENDING': 'pending',
      'ACTIVE': 'pending',
      'USER_DROPPED': 'failed',
      'CANCELLED': 'failed',
    };
    return statusMap[cashfreeStatus] || 'pending';
  }
}
