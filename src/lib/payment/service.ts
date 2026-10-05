// ============================================================
// Payment Orchestration Service
// Central service for payment creation, verification, and failover
// ============================================================

import { createAdminClient } from '@/lib/supabase';
import { PaymentRouter } from './router';
import { createGatewayAdapter } from './adapters';
import { createNotificationServer } from '@/lib/notifications';

import {
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
  // ============================================================
  // CREATE PAYMENT
  // ============================================================

  static async createPayment(
    params: CreatePaymentParams
  ): Promise<CreatePaymentResult> {
    const supabase = createAdminClient();

    try {
      // ----------------------------------------------------------
      // 1. VALIDATE AMOUNT
      // ----------------------------------------------------------

      const amount = Number(params.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        console.error('[PaymentService] Invalid payment amount:', {
          receivedAmount: params.amount,
          bookingId: params.booking_id,
          userId: params.user_id,
        });

        return {
          success: false,
          error: 'Invalid payment amount',
        };
      }

      // ----------------------------------------------------------
      // 2. SELECT GATEWAY
      // ----------------------------------------------------------

      const routingDecision = await PaymentRouter.selectGateway({
        amount,
        payment_method: params.payment_method,
      });

      if (!routingDecision) {
        console.error(
          '[PaymentService] No available payment gateway'
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
        amount,
      });

      // ----------------------------------------------------------
      // 3. CREATE PAYMENT RECORD
      // ----------------------------------------------------------

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: params.user_id,
          booking_id: params.booking_id || null,
          combo_booking_id: params.combo_booking_id || null,
          amount,
          currency: params.currency || 'INR',

          gateway: routingDecision.gateway_code,
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
            amount,
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

      // ----------------------------------------------------------
      // 4. LOG INITIAL ROUTING DECISION
      // ----------------------------------------------------------

      await PaymentRouter.logRoutingDecision(
        payment.id,
        routingDecision.gateway_id,
        'initial_selection',
        routingDecision.reason,
        1
      );

      // ----------------------------------------------------------
      // 5. CREATE PAYMENT ATTEMPT
      //
      // IMPORTANT:
      // Live DB allows:
      // created / pending / authorized / captured /
      // failed / cancelled
      //
      // DO NOT use:
      // started / order_created / success
      // ----------------------------------------------------------

      const {
        data: attempt,
        error: attemptError,
      } = await supabase
        .from('payment_attempts')
        .insert({
          payment_id: payment.id,

          gateway: routingDecision.gateway_code,
          gateway_id: routingDecision.gateway_id,

          amount,
          currency: params.currency || 'INR',

          attempt_number: 1,

          // LIVE DB VALID STATUS
          status: 'created',
        })
        .select()
        .single();

      if (attemptError || !attempt) {
        console.error(
          '[PaymentService] Failed to create payment attempt:',
          {
            code: attemptError?.code,
            message: attemptError?.message,
            details: attemptError?.details,
            hint: attemptError?.hint,
            paymentId: payment.id,
            amount,
            gateway: routingDecision.gateway_code,
          }
        );

        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason:
              attemptError?.message ||
              'Failed to create payment attempt',
          })
          .eq('id', payment.id);

        return {
          success: false,
          error:
            attemptError?.message ||
            'Failed to create payment attempt',
        };
      }

      // ----------------------------------------------------------
      // 6. CREATE GATEWAY ORDER
      // ----------------------------------------------------------

      const adapter = createGatewayAdapter(
        routingDecision.gateway_code
      );

      const orderResult: CreateOrderResult =
        await adapter.createOrder({
          amount,
          currency: params.currency || 'INR',
          payment_method: params.payment_method,
          customer_name: params.customer_name,
          customer_email: params.customer_email,
          customer_phone: params.customer_phone,
          booking_id: params.booking_id,
          combo_booking_id: params.combo_booking_id,
          metadata: params.metadata,
        });

      // ----------------------------------------------------------
      // 7. HANDLE GATEWAY ORDER FAILURE
      // ----------------------------------------------------------

      if (
        !orderResult.success ||
        !orderResult.gateway_order_id
      ) {
        console.warn(
          '[PaymentService] Gateway order creation failed:',
          {
            paymentId: payment.id,
            gateway: routingDecision.gateway_code,
            error: orderResult.error,
          }
        );

        // Mark current attempt as failed.
        // `failed` is allowed by live DB constraint.
        await supabase
          .from('payment_attempts')
          .update({
            status: 'failed',
            error_message:
              orderResult.error ||
              'Gateway order creation failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', attempt.id);

        return this.handleFailover(
          payment.id,
          routingDecision.gateway_id,
          params
        );
      }

      // ----------------------------------------------------------
      // 8. UPDATE PAYMENT ATTEMPT
      //
      // Gateway order exists and customer can now pay.
      // Use `pending`, NOT `order_created`.
      // ----------------------------------------------------------

      const { error: attemptUpdateError } = await supabase
        .from('payment_attempts')
        .update({
          status: 'pending',
          gateway_order_id:
            orderResult.gateway_order_id,
        })
        .eq('id', attempt.id);

      if (attemptUpdateError) {
        console.error(
          '[PaymentService] Failed to update payment attempt:',
          attemptUpdateError
        );
      }

      // ----------------------------------------------------------
      // 9. UPDATE PAYMENT
      // ----------------------------------------------------------

      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update({
          gateway_order_id:
            orderResult.gateway_order_id,
          status: 'checkout_started',
        })
        .eq('id', payment.id);

      if (paymentUpdateError) {
        console.error(
          '[PaymentService] Failed to update payment:',
          paymentUpdateError
        );
      }

      // ----------------------------------------------------------
      // 10. RETURN CHECKOUT DATA
      // ----------------------------------------------------------

      return {
        success: true,
        payment_id: payment.id,
        checkout_data: orderResult.checkout_data,
      };
    } catch (error: any) {
      console.error(
        '[PaymentService] Unexpected error:',
        {
          message: error?.message,
          stack: error?.stack,
          bookingId: params.booking_id,
          userId: params.user_id,
          amount: params.amount,
        }
      );

      return {
        success: false,
        error:
          error?.message ||
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
      // 1. GET CURRENT ATTEMPTS
      // --------------------------------------------------------

      const { data: attempts, error: attemptsError } =
        await supabase
          .from('payment_attempts')
          .select('attempt_number, status')
          .eq('payment_id', paymentId)
          .order('attempt_number', {
            ascending: true,
          });

      if (attemptsError) {
        console.error(
          '[PaymentService] Failed to get payment attempts:',
          attemptsError
        );
      }

      const attemptCount = attempts?.length || 0;

      // --------------------------------------------------------
      // 2. MAXIMUM ATTEMPTS
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
      // 3. FIND NEXT GATEWAY
      // --------------------------------------------------------

      const failoverDecision =
        await PaymentRouter.getFailoverGateway(
          {
            amount: Number(params.amount),
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
          gateway_id:
            failoverDecision.gateway_id,
          gateway_code:
            failoverDecision.gateway_code,
        }
      );

      // --------------------------------------------------------
      // 4. LOG FAILOVER DECISION
      // --------------------------------------------------------

      await PaymentRouter.logRoutingDecision(
        paymentId,
        failoverDecision.gateway_id,
        'failover',
        `Previous gateway failed, trying ${failoverDecision.gateway_code}`,
        attemptCount + 1
      );

      // --------------------------------------------------------
      // 5. UPDATE PAYMENT GATEWAY
      // --------------------------------------------------------

      await supabase
        .from('payments')
        .update({
          gateway:
            failoverDecision.gateway_code,
          selected_gateway:
            failoverDecision.gateway_code,
        })
        .eq('id', paymentId);

      // --------------------------------------------------------
      // 6. CREATE FALLBACK PAYMENT ATTEMPT
      // --------------------------------------------------------

      const {
        data: newAttempt,
        error: attemptError,
      } = await supabase
        .from('payment_attempts')
        .insert({
          payment_id: paymentId,

          gateway:
            failoverDecision.gateway_code,

          gateway_id:
            failoverDecision.gateway_id,

          amount: Number(params.amount),

          currency:
            params.currency || 'INR',

          attempt_number:
            attemptCount + 1,

          // LIVE DB VALID STATUS
          status: 'created',
        })
        .select()
        .single();

      if (attemptError || !newAttempt) {
        console.error(
          '[PaymentService] Failed to create failover attempt:',
          {
            code: attemptError?.code,
            message: attemptError?.message,
            details: attemptError?.details,
          }
        );

        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason:
              attemptError?.message ||
              'Failed to create fallback payment attempt',
          })
          .eq('id', paymentId);

        return {
          success: false,
          error:
            attemptError?.message ||
            'Failed to create fallback payment attempt',
        };
      }

      // --------------------------------------------------------
      // 7. CREATE ORDER WITH FALLBACK GATEWAY
      // --------------------------------------------------------

      const adapter = createGatewayAdapter(
        failoverDecision.gateway_code
      );

      const orderResult: CreateOrderResult =
        await adapter.createOrder({
          amount: Number(params.amount),
          currency:
            params.currency || 'INR',
          payment_method:
            params.payment_method,
          customer_name:
            params.customer_name,
          customer_email:
            params.customer_email,
          customer_phone:
            params.customer_phone,
          booking_id:
            params.booking_id,
          combo_booking_id:
            params.combo_booking_id,
          metadata:
            params.metadata,
        });

      // --------------------------------------------------------
      // 8. FALLBACK GATEWAY FAILURE
      // --------------------------------------------------------

      if (
        !orderResult.success ||
        !orderResult.gateway_order_id
      ) {
        await supabase
          .from('payment_attempts')
          .update({
            status: 'failed',
            error_message:
              orderResult.error ||
              'Fallback gateway order creation failed',
            completed_at:
              new Date().toISOString(),
          })
          .eq('id', newAttempt.id);

        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason:
              orderResult.error ||
              'Fallback gateway also failed',
          })
          .eq('id', paymentId);

        return {
          success: false,
          error:
            orderResult.error ||
            'Fallback gateway also failed',
        };
      }

      // --------------------------------------------------------
      // 9. UPDATE FALLBACK ATTEMPT
      //
      // Use `pending`, NOT `order_created`.
      // --------------------------------------------------------

      const {
        error: fallbackAttemptUpdateError,
      } = await supabase
        .from('payment_attempts')
        .update({
          status: 'pending',
          gateway_order_id:
            orderResult.gateway_order_id,
        })
        .eq('id', newAttempt.id);

      if (fallbackAttemptUpdateError) {
        console.error(
          '[PaymentService] Failed to update fallback attempt:',
          fallbackAttemptUpdateError
        );
      }

      // --------------------------------------------------------
      // 10. UPDATE PAYMENT
      // --------------------------------------------------------

      await supabase
        .from('payments')
        .update({
          gateway_order_id:
            orderResult.gateway_order_id,
          status: 'checkout_started',
        })
        .eq('id', paymentId);

      // --------------------------------------------------------
      // 11. RETURN CHECKOUT DATA
      // --------------------------------------------------------

      return {
        success: true,
        payment_id: paymentId,
        checkout_data:
          orderResult.checkout_data,
      };
    } catch (error: any) {
      console.error(
        '[PaymentService] Failover error:',
        {
          message: error?.message,
          stack: error?.stack,
          paymentId,
        }
      );

      await supabase
        .from('payments')
        .update({
          status: 'failed',
          failure_reason:
            error?.message ||
            'Payment failover failed',
        })
        .eq('id', paymentId);

      return {
        success: false,
        error:
          error?.message ||
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

    // ----------------------------------------------------------
    // GET PAYMENT
    // ----------------------------------------------------------

    const { data: payment, error: paymentError } =
      await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (paymentError || !payment) {
      console.error(
        '[PaymentService] Payment not found:',
        {
          paymentId,
          error: paymentError,
        }
      );

      return;
    }

    // ----------------------------------------------------------
    // UPDATE PAYMENT
    // ----------------------------------------------------------

    const { error: paymentUpdateError } =
      await supabase
        .from('payments')
        .update({
          status: 'success',
          gateway_payment_id:
            gatewayPaymentId,
          paid_at:
            new Date().toISOString(),
        })
        .eq('id', paymentId);

    if (paymentUpdateError) {
      console.error(
        '[PaymentService] Failed to update successful payment:',
        paymentUpdateError
      );
    }

    // ----------------------------------------------------------
    // UPDATE PAYMENT ATTEMPT
    //
    // `captured` is the valid live DB status.
    // ----------------------------------------------------------

    const { data: capturedAttempt, error: attemptError } =
      await supabase
        .from('payment_attempts')
        .update({
          status: 'captured',
          gateway_payment_id:
            gatewayPaymentId,
          completed_at:
            new Date().toISOString(),
        })
        .eq('payment_id', paymentId)
        .in('status', [
          'pending',
          'authorized',
        ])
        .order('attempt_number', {
          ascending: false,
        })
        .limit(1)
        .select()
        .maybeSingle();

    if (attemptError) {
      console.error(
        '[PaymentService] Failed to update successful payment attempt:',
        attemptError
      );
    }

    // ----------------------------------------------------------
    // UPDATE GATEWAY USAGE
    // ----------------------------------------------------------

    const { data: gateway } =
      await supabase
        .from('payment_gateways')
        .select('id')
        .eq('code', gatewayCode)
        .maybeSingle();

    if (gateway) {
      const { error: usageError } =
        await supabase.rpc(
          'update_gateway_usage',
          {
            p_gateway_id: gateway.id,
            p_amount: Number(payment.amount),
            p_success: true,
          }
        );

      if (usageError) {
        console.error(
          '[PaymentService] Failed to update gateway usage:',
          usageError
        );
      }
    }

    // ----------------------------------------------------------
    // UPDATE BOOKING STATUS
    // ----------------------------------------------------------

    if (payment.booking_id) {
      const { error: bookingError } =
        await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
          })
          .eq('id', payment.booking_id);

      if (bookingError) {
        console.error(
          '[PaymentService] Failed to update booking payment status:',
          bookingError
        );
      }
    }

    // ----------------------------------------------------------
    // UPDATE COMBO BOOKING STATUS
    // ----------------------------------------------------------

    if (payment.combo_booking_id) {
      const { error: comboError } =
        await supabase
          .from('combo_bookings')
          .update({
            payment_status: 'paid',
          })
          .eq(
            'id',
            payment.combo_booking_id
          );

      if (comboError) {
        console.error(
          '[PaymentService] Failed to update combo booking payment status:',
          comboError
        );
      }
    }

    // ----------------------------------------------------------
    // SEND SUCCESS NOTIFICATION
    // ----------------------------------------------------------

    try {
      await createNotificationServer({
        userId: payment.user_id,

        bookingId:
          payment.booking_id ||
          payment.combo_booking_id ||
          undefined,

        title: 'Payment Successful! 💳',

        message:
          `Your payment of ₹${payment.amount} was successful. ` +
          `${payment.booking_id
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

    // ----------------------------------------------------------
    // GET PAYMENT
    // ----------------------------------------------------------

    const { data: payment, error: paymentError } =
      await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (paymentError || !payment) {
      console.error(
        '[PaymentService] Payment not found:',
        {
          paymentId,
          error: paymentError,
        }
      );

      return;
    }

    // ----------------------------------------------------------
    // UPDATE PAYMENT
    // ----------------------------------------------------------

    await supabase
      .from('payments')
      .update({
        status: 'failed',
        failure_reason: reason,
        failed_at:
          new Date().toISOString(),
      })
      .eq('id', paymentId);

    // ----------------------------------------------------------
    // UPDATE PAYMENT ATTEMPT
    //
    // Valid statuses that can be failed:
    // created / pending / authorized
    // ----------------------------------------------------------

    const { error: attemptError } =
      await supabase
        .from('payment_attempts')
        .update({
          status: 'failed',
          error_message: reason,
          completed_at:
            new Date().toISOString(),
        })
        .eq('payment_id', paymentId)
        .in('status', [
          'created',
          'pending',
          'authorized',
        ])
        .order('attempt_number', {
          ascending: false,
        })
        .limit(1);

    if (attemptError) {
      console.error(
        '[PaymentService] Failed to update failed payment attempt:',
        attemptError
      );
    }

    // ----------------------------------------------------------
    // UPDATE GATEWAY USAGE
    // ----------------------------------------------------------

    if (payment.selected_gateway) {
      const { data: gateway } =
        await supabase
          .from('payment_gateways')
          .select('id')
          .eq(
            'code',
            payment.selected_gateway
          )
          .maybeSingle();

      if (gateway) {
        const { error: usageError } =
          await supabase.rpc(
            'update_gateway_usage',
            {
              p_gateway_id: gateway.id,
              p_amount: Number(payment.amount),
              p_success: false,
            }
          );

        if (usageError) {
          console.error(
            '[PaymentService] Failed to update failed gateway usage:',
            usageError
          );
        }
      }
    }

    // ----------------------------------------------------------
    // SEND FAILURE NOTIFICATION
    // ----------------------------------------------------------

    try {
      await createNotificationServer({
        userId: payment.user_id,

        bookingId:
          payment.booking_id ||
          payment.combo_booking_id ||
          undefined,

        title: 'Payment Failed ❌',

        message:
          `Your payment of ₹${payment.amount} failed. ` +
          `Reason: ${reason}. ` +
          `Please try again or use a different payment method.`,

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

  static async getPayment(
    paymentId: string
  ) {
    const supabase = createAdminClient();

    const { data, error } =
      await supabase
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

  static async getPaymentAttempts(
    paymentId: string
  ) {
    const supabase = createAdminClient();

    const { data, error } =
      await supabase
        .from('payment_attempts')
        .select(
          '*, gateway:payment_gateways(*)'
        )
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