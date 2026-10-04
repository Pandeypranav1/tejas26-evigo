// ============================================================
// Razorpay Gateway Adapter
// ============================================================

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { IPaymentGatewayAdapter } from '../gateway-adapter';
import {
  CreateOrderParams,
  CreateOrderResult,
  PaymentStatusResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  RefundParams,
  RefundResult,
  WebhookEvent,
  ProcessWebhookResult,
  PaymentMethod,
  PaymentStatus,
} from '../types';

export class RazorpayAdapter implements IPaymentGatewayAdapter {
  private instance: Razorpay;
  private keyId: string;
  private keySecret: string;

  constructor() {
    const env = process.env.PAYMENT_ENV || 'sandbox';
    this.keyId = env === 'production' 
      ? (process.env.RAZORPAY_KEY_ID || '')
      : (process.env.RAZORPAY_KEY_ID_SANDBOX || '');
    this.keySecret = env === 'production'
      ? (process.env.RAZORPAY_KEY_SECRET || '')
      : (process.env.RAZORPAY_KEY_SECRET_SANDBOX || '');

    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    this.instance = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    try {
      const amountInPaise = Math.round(params.amount * 100); // Razorpay uses smallest currency unit

      const options = {
        amount: amountInPaise,
        currency: params.currency,
        receipt: params.booking_id || params.combo_booking_id || `receipt_${Date.now()}`,
        notes: {
          customer_name: params.customer_name,
          customer_email: params.customer_email || '',
          customer_phone: params.customer_phone,
          booking_id: params.booking_id || '',
          combo_booking_id: params.combo_booking_id || '',
          ...params.metadata,
        },
      };

      const order = await this.instance.orders.create(options);

      return {
        success: true,
        gateway_order_id: order.id,
        checkout_data: {
          key: this.keyId,
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          name: 'Evigo',
          description: params.booking_id ? 'Transport Booking' : 'Combo Pack Booking',
          image: '',
          prefill: {
            name: params.customer_name,
            email: params.customer_email,
            contact: params.customer_phone,
          },
          theme: {
            color: '#3399cc',
          },
        },
      };
    } catch (error: any) {
      console.error('[RazorpayAdapter] createOrder error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create Razorpay order',
      };
    }
  }

  async getPaymentStatus(gateway_order_id: string): Promise<PaymentStatusResult> {
    try {
      const order = await this.instance.orders.fetch(gateway_order_id);
      
      // Map Razorpay status to our PaymentStatus
      let status: PaymentStatus = 'pending';
      if (order.status === 'created') status = 'created';
      else if (order.status === 'attempted') status = 'checkout_started';
      else if (order.status === 'paid') status = 'success';
      else if (order.status === 'failed') status = 'failed';

      return {
        success: true,
        status,
        gateway_payment_id: order.receipt,
        paid_amount: order.amount ? Number(order.amount) / 100 : undefined,
      };
    } catch (error: any) {
      console.error('[RazorpayAdapter] getPaymentStatus error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch payment status',
      };
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    try {
      // Verify signature
      if (params.signature) {
        const generatedSignature = crypto
          .createHmac('sha256', this.keySecret)
          .update(`${params.gateway_order_id}|${params.gateway_payment_id}`)
          .digest('hex');

        if (generatedSignature !== params.signature) {
          return {
            success: false,
            status: 'failed',
            error: 'Invalid signature',
          };
        }
      }

      // Fetch payment details
      const payment = await this.instance.payments.fetch(params.gateway_payment_id!);
      
      let status: PaymentStatus = 'pending';
      if (payment.status === 'captured') status = 'success';
      else if (payment.status === 'authorized') status = 'pending';
      else if (payment.status === 'failed') status = 'failed';
      else if (payment.status === 'refunded') status = 'refunded';

      return {
        success: true,
        status,
        gateway_payment_id: payment.id,
      };
    } catch (error: any) {
      console.error('[RazorpayAdapter] verifyPayment error:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message || 'Payment verification failed',
      };
    }
  }

  async handleWebhook(event: WebhookEvent): Promise<ProcessWebhookResult> {
    try {
      const payload = event.payload;
      const eventType = payload.event;

      let paymentId: string | undefined;
      let status: PaymentStatus = 'pending';

      switch (eventType) {
        case 'payment.captured':
          paymentId = payload.payload.payment.entity.order_id;
          status = 'success';
          break;
        case 'payment.authorized':
          paymentId = payload.payload.payment.entity.order_id;
          status = 'pending';
          break;
        case 'payment.failed':
          paymentId = payload.payload.payment.entity.order_id;
          status = 'failed';
          break;
        case 'refund.processed':
          paymentId = payload.payload.refund.entity.payment_id;
          status = 'refunded';
          break;
        default:
          return {
            success: false,
            error: `Unhandled event type: ${eventType}`,
          };
      }

      return {
        success: true,
        payment_id: paymentId,
        status,
      };
    } catch (error: any) {
      console.error('[RazorpayAdapter] handleWebhook error:', error);
      return {
        success: false,
        error: error.message || 'Webhook processing failed',
      };
    }
  }

  async refundPayment(params: RefundParams): Promise<RefundResult> {
    try {
      const amountInPaise = Math.round(params.amount * 100);

      const refund = await this.instance.payments.refund(params.gateway_payment_id, {
        amount: amountInPaise,
        notes: {
          reason: params.reason || 'Refund initiated',
        },
      });

      return {
        success: true,
        gateway_refund_id: refund.id,
      };
    } catch (error: any) {
      console.error('[RazorpayAdapter] refundPayment error:', error);
      return {
        success: false,
        error: error.message || 'Refund failed',
      };
    }
  }

  getSupportedPaymentMethods(): PaymentMethod[] {
    return ['upi', 'card', 'netbanking', 'wallet', 'emi'];
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('[RazorpayAdapter] verifyWebhookSignature error:', error);
      return false;
    }
  }
}
