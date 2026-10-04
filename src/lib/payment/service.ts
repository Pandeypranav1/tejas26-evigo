// ============================================================
// Payment Orchestration Service
// Central service for payment creation, verification, and failover
// ============================================================

import { createAdminClient } from '@/lib/supabase';
import { PaymentRouter } from './router';
import { createGatewayAdapter } from './adapters';
import { createNotificationServer } from '@/lib/notifications';

import {
  PaymentStatus,
  PaymentMethod,
  GatewayCode,
  CreateOrderResult,
} from './types';

export interface CreatePaymentParams {
  user_id: string;
  amount: number;
  currency?: string;
  payment_method: PaymentMethod;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  booking_id?: string;
  combo_booking_id?: string;
  metadata?: Record<string, any>;
}

export interface CreatePaymentResult {
  success: boolean;
  payment_id?: string;
  checkout_data?: any;
  error?: string;
}

export class PaymentService {
  /**
   * Create a payment and route to appropriate gateway
   */
  static async createPayment(
    params: CreatePaymentParams
  ): Promise<CreatePaymentResult> {
    const supabase = createAdminClient();

    try {
      // ========================================================
      // 1. SELECT GATEWAY FIRST
      // ========================================================
      // IMPORTANT:
      // The payments.gateway column is NOT NULL.
      // Therefore gateway must be selected BEFORE inserting
      // the payment record.
      // ========================================================

      const routingDecision = await PaymentRouter.selectGateway({
        amount: params.amount,
        payment_method: params.payment_method,
      });

      if (!routingDecision) {
        console.error(
          '[PaymentService] No available payment gateway for request'
        );

        return {
          success: false,
          error: 'No available payment gateway',
        };
      }

      console.log('[PaymentService] Gateway selected:', {
        gateway_id: routingDecision.gateway_id,
        gateway_code: routingDecision.gateway_code,
        reason: routingDecision.reason,
      });

      // ========================================================
      // 2. CREATE PAYMENT RECORD
      // ========================================================
      // gateway is now available, so the NOT NULL constraint
      // will be satisfied.
      // ========================================================

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: params.user_id,
          booking_id: params.booking_id || null,
          combo_booking_id: params.combo_booking_id || null,
          amount: params.amount,
          currency: params.currency || 'INR',

          // IMPORTANT FIX
          gateway: routingDecision.gateway_code,

          // Keep selected_gateway in sync with gateway.
          selected_gateway: routingDecision.gateway_code,

          status: 'created',
        })
        .select()
        .single();

      if (paymentError || !payment) {
        console.error(
          '[PaymentService] Failed to create payment record:',
          {
            code: paymentError?.code,
            message: paymentError?.message,
            details: paymentError?.details,
            hint: paymentError?.hint,
            userId: params.user_id,
            bookingId: params.booking_id,
            amount: params.amount,
            gateway: routingDecision.gateway_code,
          }
        );

        return {
          success: false,
          error:
            paymentError?.message ||
            'Failed to create payment record',
        };
      }

      // ========================================================
      // 3. LOG INITIAL ROUTING DECISION
      // ========================================================

      await PaymentRouter.logRoutingDecision(
        payment.id,
        routingDecision.gateway_id,
        'initial_selection',
        routingDecision.reason,
        1
      );

      // ========================================================
      // 4. CREATE PAYMENT ATTEMPT
      // ========================================================

      const { data: attempt, error: attemptError } = await supabase
        .from('payment_attempts')
        .insert({
          payment_id: payment.id,
          gateway_id: routingDecision.gateway_id,
          attempt_number: 1,
          status: 'started',
        })
        .select()
        .single();

      if (attemptError || !attempt) {
        console.error(
          '[PaymentService] Failed to create payment attempt:',
          attemptError
        );

        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason: 'Failed to create payment attempt',
          })
          .eq('id', payment.id);

        return {
          success: false,
          error: 'Failed to create payment attempt',
        };
      }

      // ========================================================
      // 5. CREATE ORDER WITH SELECTED GATEWAY
      // ========================================================

      const adapter = createGatewayAdapter(
        routingDecision.gateway_code
      );

      const orderResult: CreateOrderResult =
        await adapter.createOrder({
          amount: params.amount,
          currency: params.currency || 'INR',
          payment_method: params.payment_method,
          customer_name: params.customer_name,
          customer_email: params.customer_email,
          customer_phone: params.customer_phone,
          booking_id: params.booking_id,
          combo_booking_id: params.combo_booking_id,
          metadata: params.metadata,
        });

      // ========================================================
      // 6. HANDLE GATEWAY ORDER FAILURE
      // ========================================================

      if (
        !orderResult.success ||
        !orderResult.gateway_order_id
      ) {
        console.warn(
          '[PaymentService] Order creation failed, attempting failover:',
          {
            paymentId: payment.id,
            gateway: routingDecision.gateway_code,
            error: orderResult.error,
          }
        );

        return this.handleFailover(
          payment.id,
          routingDecision.gateway_id,
          params
        );
      }

      // ========================================================
      // 7. UPDATE PAYMENT ATTEMPT
      // ========================================================

      await supabase
        .from('payment_attempts')
        .update({
          status: 'order_created',
          gateway_order_id: orderResult.gateway_order_id,
        })
        .eq('id', attempt.id);

      // ========================================================
      // 8. UPDATE PAYMENT
      // ========================================================

      await supabase
        .from('payments')
        .update({
          gateway_order_id: orderResult.gateway_order_id,
          status: 'checkout_started',
        })
        .eq('id', payment.id);

      // ========================================================
      // 9. RETURN CHECKOUT DATA
      // ========================================================

      return {
        success: true,
        payment_id: payment.id,
        checkout_data: orderResult.checkout_data,
      };
    } catch (error: any) {
      console.error(
        '[PaymentService] Unexpected error:',
        error
      );

      return {
        success: false,
        error:
          error.message ||
          'Payment creation failed',
      };
    }
  }

  // ============================================================
  // HANDLE FAILOVER TO NEXT AVAILABLE GATEWAY
  // ============================================================

  private static async handleFailover(
    paymentId: string,
    failedGatewayId: string,
    params: CreatePaymentParams
  ): Promise<CreatePaymentResult> {
    const supabase = createAdminClient();

    try {
      // --------------------------------------------------------
      // Get current attempt count
      // --------------------------------------------------------

      const { data: attempts } = await supabase
        .from('payment_attempts')
        .select('attempt_number')
        .eq('payment_id', paymentId);

      const attemptCount = attempts?.length || 0;

      // --------------------------------------------------------
      // Maximum attempts reached
      // --------------------------------------------------------

      if (attemptCount >= 2) {
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason:
              'All payment gateways unavailable',
          })
          .eq('id', paymentId);

        return {
          success: false,
          error: 'All payment gateways unavailable',
        };
      }

      // --------------------------------------------------------
      // Find next gateway
      // --------------------------------------------------------

      const failoverDecision =
        await PaymentRouter.getFailoverGateway(
          {
            amount: params.amount,
            payment_method: params.payment_method,
          },
          failedGatewayId
        );

      if (!failoverDecision) {
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason:
              'No fallback gateway available',
          })
          .eq('id', paymentId);

        return {
          success: false,
          error: 'No fallback gateway available',
        };
      }

      console.log(
        '[PaymentService] Failover gateway selected:',
        {
          gateway_id: failoverDecision.gateway_id,
          gateway_code:
            failoverDecision.gateway_code,
        }
      );

      // --------------------------------------------------------
      // Log failover decision
      // --------------------------------------------------------

      await PaymentRouter.logRoutingDecision(
        paymentId,
        failoverDecision.gateway_id,
        'failover',
        `Previous gateway failed, trying ${failoverDecision.gateway_code}`,
        attemptCount + 1
      );

      // --------------------------------------------------------
      // Update payment gateway
      // --------------------------------------------------------

      await supabase
        .from('payments')
        .update({
          gateway: failoverDecision.gateway_code,
          selected_gateway:
            failoverDecision.gateway_code,
        })
        .eq('id', paymentId);

      // --------------------------------------------------------
      // Create new payment attempt
      // --------------------------------------------------------

      const { data: newAttempt, error: attemptError } =
        await supabase
          .from('payment_attempts')
          .insert({
            payment_id: paymentId,
            gateway_id: failoverDecision.gateway_id,
            attempt_number: attemptCount + 1,
            status: 'started',
          })
          .select()
          .single();

      if (attemptError || !newAttempt) {
        console.error(
          '[PaymentService] Failed to create failover attempt:',
          attemptError
        );

        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason:
              'Failed to create fallback payment attempt',
          })
          .eq('id', paymentId);

        return {
          success: false,
          error:
            'Failed to create fallback payment attempt',
        };
      }

      // --------------------------------------------------------
      // Create order with fallback gateway
      // --------------------------------------------------------

      const adapter = createGatewayAdapter(
        failoverDecision.gateway_code
      );

      const orderResult: CreateOrderResult =
        await adapter.createOrder({
          amount: params.amount,
          currency: params.currency || 'INR',
          payment_method: params.payment_method,
          customer_name: params.customer_name,
          customer_email: params.customer_email,
          customer_phone: params.customer_phone,
          booking_id: params.booking_id,
          combo_booking_id: params.combo_booking_id,
          metadata: params.metadata,
        });

      // --------------------------------------------------------
      // Fallback gateway also failed
      // --------------------------------------------------------

      if (
        !orderResult.success ||
        !orderResult.gateway_order_id
      ) {
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason:
              'Fallback gateway also failed',
          })
          .eq('id', paymentId);

        return {
          success: false,
          error: 'Fallback gateway also failed',
        };
      }

      // --------------------------------------------------------
      // Update fallback attempt
      // --------------------------------------------------------

      await supabase
        .from('payment_attempts')
        .update({
          status: 'order_created',
          gateway_order_id:
            orderResult.gateway_order_id,
        })
        .eq('id', newAttempt.id);

      // --------------------------------------------------------
      // Update payment
      // --------------------------------------------------------

      await supabase
        .from('payments')
        .update({
          gateway_order_id:
            orderResult.gateway_order_id,
          status: 'checkout_started',
        })
        .eq('id', paymentId);

      return {
        success: true,
        payment_id: paymentId,
        checkout_data:
          orderResult.checkout_data,
      };
    } catch (error: any) {
      console.error(
        '[PaymentService] Failover error:',
        error
      );

      await supabase
        .from('payments')
        .update({
          status: 'failed',
          failure_reason:
            error.message ||
            'Payment failover failed',
        })
        .eq('id', paymentId);

      return {
        success: false,
        error:
          error.message ||
          'Payment failover failed',
      };
    }
  }

  // ============================================================
  // PROCESS SUCCESSFUL PAYMENT
  // ============================================================

  static async processSuccessfulPayment(
    paymentId: string,
    gatewayPaymentId: string,
    gatewayCode: GatewayCode
  ): Promise<void> {
    const supabase = createAdminClient();

    // Get payment details
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      console.error(
        '[PaymentService] Payment not found:',
        paymentId
      );
      return;
    }

    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: 'success',
        gateway_payment_id: gatewayPaymentId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    // Update payment attempt
    await supabase
      .from('payment_attempts')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentId)
      .eq('status', 'order_created')
      .order('attempt_number', {
        ascending: false,
      })
      .limit(1);

    // Update gateway usage
    const { data: gateway } = await supabase
      .from('payment_gateways')
      .select('id')
      .eq('code', gatewayCode)
      .single();

    if (gateway) {
      await supabase.rpc('update_gateway_usage', {
        p_gateway_id: gateway.id,
        p_amount: payment.amount,
        p_success: true,
      });
    }

    // Update booking status
    if (payment.booking_id) {
      await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
        })
        .eq('id', payment.booking_id);
    }

    // Update combo booking status
    if (payment.combo_booking_id) {
      await supabase
        .from('combo_bookings')
        .update({
          payment_status: 'paid',
        })
        .eq('id', payment.combo_booking_id);
    }

    // Send payment success notification
    try {
      await createNotificationServer({
        userId: payment.user_id,
        bookingId:
          payment.booking_id ||
          payment.combo_booking_id ||
          undefined,
        title: 'Payment Successful! 💳',
        message: `Your payment of ₹${payment.amount} was successful. ${payment.booking_id
          ? 'Booking confirmed.'
          : 'Combo booking confirmed.'
          }`,
        type: 'booking_confirmed',
      });
    } catch (notifyErr) {
      console.warn(
        '[PaymentService] Failed to send payment success notification:',
        notifyErr
      );
    }
  }

  // ============================================================
  // PROCESS FAILED PAYMENT
  // ============================================================

  static async processFailedPayment(
    paymentId: string,
    reason: string
  ): Promise<void> {
    const supabase = createAdminClient();

    // Get payment details
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      console.error(
        '[PaymentService] Payment not found:',
        paymentId
      );
      return;
    }

    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        failure_reason: reason,
        failed_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    // Update payment attempt
    await supabase
      .from('payment_attempts')
      .update({
        status: 'failed',
        error_message: reason,
        completed_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentId)
      .eq('status', 'order_created')
      .order('attempt_number', {
        ascending: false,
      })
      .limit(1);

    // Update gateway usage
    if (payment.selected_gateway) {
      const { data: gateway } = await supabase
        .from('payment_gateways')
        .select('id')
        .eq('code', payment.selected_gateway)
        .single();

      if (gateway) {
        await supabase.rpc('update_gateway_usage', {
          p_gateway_id: gateway.id,
          p_amount: payment.amount,
          p_success: false,
        });
      }
    }

    // Send payment failed notification
    try {
      await createNotificationServer({
        userId: payment.user_id,
        bookingId:
          payment.booking_id ||
          payment.combo_booking_id ||
          undefined,
        title: 'Payment Failed ❌',
        message: `Your payment of ₹${payment.amount} failed. Reason: ${reason}. Please try again or use a different payment method.`,
        type: 'booking_rejected',
      });
    } catch (notifyErr) {
      console.warn(
        '[PaymentService] Failed to send payment failed notification:',
        notifyErr
      );
    }
  }

  // ============================================================
  // GET PAYMENT BY ID
  // ============================================================

  static async getPayment(paymentId: string) {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) {
      console.error(
        '[PaymentService] Failed to get payment:',
        error
      );
      return null;
    }

    return data;
  }

  // ============================================================
  // GET PAYMENT ATTEMPTS
  // ============================================================

  static async getPaymentAttempts(paymentId: string) {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('payment_attempts')
      .select('*, gateway:payment_gateways(*)')
      .eq('payment_id', paymentId)
      .order('attempt_number', {
        ascending: true,
      });

    if (error) {
      console.error(
        '[PaymentService] Failed to get payment attempts:',
        error
      );
      return [];
    }

    return data || [];
  }
}