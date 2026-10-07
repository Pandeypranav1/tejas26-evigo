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

    this.keyId =
      env === 'production'
        ? process.env.RAZORPAY_KEY_ID || ''
        : process.env.RAZORPAY_KEY_ID_SANDBOX || '';

    this.keySecret =
      env === 'production'
        ? process.env.RAZORPAY_KEY_SECRET || ''
        : process.env.RAZORPAY_KEY_SECRET_SANDBOX || '';

    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    this.instance = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  // ============================================================
  // CREATE ORDER
  // ============================================================

  async createOrder(
    params: CreateOrderParams
  ): Promise<CreateOrderResult> {
    try {
      const amountInPaise = Math.round(params.amount * 100);

      const options = {
        amount: amountInPaise,
        currency: params.currency,

        receipt:
          params.booking_id ||
          params.combo_booking_id ||
          `receipt_${Date.now()}`,

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

      console.log('[RazorpayAdapter] Order created:', {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        bookingId: params.booking_id,
      });

      return {
        success: true,

        gateway_order_id: order.id,

        checkout_data: {
          key: this.keyId,

          order_id: order.id,

          amount: order.amount,

          currency: order.currency,

          name: 'Evigo',

          description: params.booking_id
            ? 'Transport Booking'
            : 'Combo Pack Booking',

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
      console.error(
        '[RazorpayAdapter] createOrder error:',
        error
      );

      return {
        success: false,
        error:
          error?.message ||
          'Failed to create Razorpay order',
      };
    }
  }

  // ============================================================
  // GET PAYMENT STATUS
  // ============================================================

  async getPaymentStatus(
    gateway_order_id: string
  ): Promise<PaymentStatusResult> {
    try {
      const order =
        await this.instance.orders.fetch(gateway_order_id);

      let status: PaymentStatus = 'pending';

      if (order.status === 'created') {
        status = 'created';
      } else if (order.status === 'attempted') {
        status = 'checkout_started';
      } else if (order.status === 'paid') {
        status = 'success';
      } else if (order.status === 'failed') {
        status = 'failed';
      }

      return {
        success: true,

        status,

        gateway_payment_id:
          order.receipt,

        paid_amount: order.amount
          ? Number(order.amount) / 100
          : undefined,
      };
    } catch (error: any) {
      console.error(
        '[RazorpayAdapter] getPaymentStatus error:',
        error
      );

      return {
        success: false,
        error:
          error?.message ||
          'Failed to fetch payment status',
      };
    }
  }

  // ============================================================
  // VERIFY PAYMENT
  // ============================================================

  async verifyPayment(
    params: VerifyPaymentParams
  ): Promise<VerifyPaymentResult> {
    try {
      // --------------------------------------------------------
      // Verify Razorpay checkout signature
      // --------------------------------------------------------

      if (params.signature) {
        const generatedSignature = crypto
          .createHmac('sha256', this.keySecret)
          .update(
            `${params.gateway_order_id}|${params.gateway_payment_id}`
          )
          .digest('hex');

        if (generatedSignature !== params.signature) {
          return {
            success: false,
            status: 'failed',
            error: 'Invalid signature',
          };
        }
      }

      // --------------------------------------------------------
      // Fetch actual Razorpay payment
      // --------------------------------------------------------

      const payment =
        await this.instance.payments.fetch(
          params.gateway_payment_id!
        );

      let status: PaymentStatus = 'pending';

      if (payment.status === 'captured') {
        status = 'success';
      } else if (payment.status === 'authorized') {
        status = 'pending';
      } else if (payment.status === 'failed') {
        status = 'failed';
      } else if (payment.status === 'refunded') {
        status = 'refunded';
      }

      return {
        success: true,

        status,

        gateway_payment_id: payment.id,
      };
    } catch (error: any) {
      console.error(
        '[RazorpayAdapter] verifyPayment error:',
        error
      );

      return {
        success: false,
        status: 'failed',
        error:
          error?.message ||
          'Payment verification failed',
      };
    }
  }

  // ============================================================
  // HANDLE WEBHOOK
  // ============================================================

  async handleWebhook(
    event: WebhookEvent
  ): Promise<ProcessWebhookResult> {
    try {
      const payload = event.payload;

      const eventType = payload?.event;

      const paymentEntity =
        payload?.payload?.payment?.entity;

      const refundEntity =
        payload?.payload?.refund?.entity;

      // --------------------------------------------------------
      // Log webhook event
      // --------------------------------------------------------

      console.log('[RazorpayAdapter] Webhook received:', {
        eventType,
        razorpayPaymentId:
          paymentEntity?.id || null,
        razorpayOrderId:
          paymentEntity?.order_id || null,
      });

      let gatewayPaymentId: string | undefined;

      let status: PaymentStatus = 'pending';

      // --------------------------------------------------------
      // PAYMENT CAPTURED
      // --------------------------------------------------------

      switch (eventType) {
        case 'payment.captured': {
          gatewayPaymentId =
            paymentEntity?.id;

          status = 'success';

          break;
        }

        // ------------------------------------------------------
        // PAYMENT AUTHORIZED
        // ------------------------------------------------------

        case 'payment.authorized': {
          gatewayPaymentId =
            paymentEntity?.id;

          status = 'pending';

          break;
        }

        // ------------------------------------------------------
        // PAYMENT FAILED
        // ------------------------------------------------------

        case 'payment.failed': {
          gatewayPaymentId =
            paymentEntity?.id;

          status = 'failed';

          break;
        }

        // ------------------------------------------------------
        // REFUND PROCESSED
        // ------------------------------------------------------

        case 'refund.processed': {
          gatewayPaymentId =
            refundEntity?.payment_id;

          status = 'refunded';

          break;
        }

        // ------------------------------------------------------
        // ORDER PAID
        //
        // order.paid may not contain payment.entity.id.
        // The webhook route will use order_id to find the
        // internal payment record.
        // ------------------------------------------------------

        case 'order.paid': {
          const orderEntity =
            payload?.payload?.order?.entity;

          console.log(
            '[RazorpayAdapter] order.paid received:',
            {
              orderId: orderEntity?.id || null,
            }
          );

          return {
            success: true,

            payment_id:
              orderEntity?.id,

            status: 'success',
          };
        }

        // ------------------------------------------------------
        // OTHER EVENTS
        // ------------------------------------------------------

        default: {
          console.log(
            '[RazorpayAdapter] Ignoring unsupported event:',
            eventType
          );

          return {
            success: true,

            status: 'pending',
          };
        }
      }

      // --------------------------------------------------------
      // Payment ID is required for payment events
      // --------------------------------------------------------

      if (!gatewayPaymentId) {
        console.error(
          '[RazorpayAdapter] Razorpay payment ID missing:',
          {
            eventType,
            payload,
          }
        );

        return {
          success: false,
          error:
            'Razorpay payment ID missing from webhook payload',
        };
      }

      // --------------------------------------------------------
      // IMPORTANT
      //
      // payment_id here means Razorpay's payment ID:
      //
      // pay_xxxxxxxxx
      //
      // It does NOT mean our internal payments.id.
      // --------------------------------------------------------

      return {
        success: true,

        payment_id: gatewayPaymentId,

        status,
      };
    } catch (error: any) {
      console.error(
        '[RazorpayAdapter] handleWebhook error:',
        error
      );

      return {
        success: false,

        error:
          error?.message ||
          'Webhook processing failed',
      };
    }
  }

  // ============================================================
  // REFUND PAYMENT
  // ============================================================

  async refundPayment(
    params: RefundParams
  ): Promise<RefundResult> {
    try {
      const amountInPaise =
        Math.round(params.amount * 100);

      const refund =
        await this.instance.payments.refund(
          params.gateway_payment_id,
          {
            amount: amountInPaise,

            notes: {
              reason:
                params.reason ||
                'Refund initiated',
            },
          }
        );

      return {
        success: true,

        gateway_refund_id: refund.id,
      };
    } catch (error: any) {
      console.error(
        '[RazorpayAdapter] refundPayment error:',
        error
      );

      return {
        success: false,

        error:
          error?.message ||
          'Refund failed',
      };
    }
  }

  // ============================================================
  // SUPPORTED PAYMENT METHODS
  // ============================================================

  getSupportedPaymentMethods(): PaymentMethod[] {
    return [
      'upi',
      'card',
      'netbanking',
      'wallet',
      'emi',
    ];
  }

  // ============================================================
  // VERIFY WEBHOOK SIGNATURE
  // ============================================================

  verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac(
          'sha256',
          process.env.PAYMENT_ENV === 'production'
            ? process.env.RAZORPAY_WEBHOOK_SECRET || ''
            : process.env.RAZORPAY_WEBHOOK_SECRET_SANDBOX || ''
        )
        .update(payload)
        .digest('hex');

      return (
        expectedSignature.length ===
        signature.length &&
        crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(signature)
        )
      );
    } catch (error) {
      console.error(
        '[RazorpayAdapter] verifyWebhookSignature error:',
        error
      );

      return false;
    }
  }
}