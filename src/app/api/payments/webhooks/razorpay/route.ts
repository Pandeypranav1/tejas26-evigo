// ============================================================
// Razorpay Webhook Handler
// ============================================================

import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase';

import { createGatewayAdapter } from '@/lib/payment/adapters';

import { PaymentService } from '@/lib/payment/service';

import crypto from 'crypto';

export const runtime = 'nodejs';

// ============================================================
// POST
// ============================================================

export async function POST(request: Request) {
  try {
    // ==========================================================
    // 1. READ RAW BODY
    // ==========================================================

    // IMPORTANT:
    // Razorpay signature must be calculated using the exact
    // raw request body.
    // ==========================================================

    const body = await request.text();

    const signature =
      request.headers.get(
        'x-razorpay-signature'
      );

    if (!signature) {
      console.error(
        '[Razorpay Webhook] Missing signature'
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Missing signature',
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================================
    // 2. GET WEBHOOK SECRET
    // ==========================================================

    const env =
      process.env.PAYMENT_ENV || 'sandbox';

    const secret =
      env === 'production'
        ? process.env.RAZORPAY_WEBHOOK_SECRET || ''
        : process.env
          .RAZORPAY_WEBHOOK_SECRET_SANDBOX || '';

    if (!secret) {
      console.error(
        '[Razorpay Webhook] Webhook secret not configured'
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Webhook secret not configured',
        },
        {
          status: 500,
        }
      );
    }

    // ==========================================================
    // 3. VERIFY RAZORPAY SIGNATURE
    // ==========================================================

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const signaturesMatch =
      expectedSignature.length ===
      signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      );

    if (!signaturesMatch) {
      console.error(
        '[Razorpay Webhook] Invalid signature'
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid signature',
        },
        {
          status: 401,
        }
      );
    }

    // ==========================================================
    // 4. PARSE PAYLOAD
    // ==========================================================

    let payload: any;

    try {
      payload = JSON.parse(body);
    } catch {
      console.error(
        '[Razorpay Webhook] Invalid JSON payload'
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON payload',
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================================
    // 5. GET EVENT ID FROM RAZORPAY HEADER
    // ==========================================================

    // IMPORTANT:
    //
    // Razorpay sends event ID in:
    //
    // x-razorpay-event-id
    //
    // Do NOT use payload.id or payload.event_id.
    // ==========================================================

    const eventId =
      request.headers.get(
        'x-razorpay-event-id'
      );

    if (!eventId) {
      console.error(
        '[Razorpay Webhook] Missing event ID'
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Missing event ID',
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================================
    // 6. EVENT TYPE
    // ==========================================================

    const eventType =
      payload?.event;

    if (!eventType) {
      console.error(
        '[Razorpay Webhook] Missing event type'
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Missing event type',
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      '[Razorpay Webhook] Received:',
      {
        eventId,
        eventType,
      }
    );

    // ==========================================================
    // 7. CREATE ADMIN SUPABASE CLIENT
    // ==========================================================

    const supabase =
      createAdminClient();

    // ==========================================================
    // 8. CHECK DUPLICATE WEBHOOK
    // ==========================================================

    const {
      data: existingEvent,
      error: existingEventError,
    } = await supabase
      .from('payment_webhook_events')
      .select('*')
      .eq('gateway', 'razorpay')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingEventError) {
      console.error(
        '[Razorpay Webhook] Failed to check existing event:',
        existingEventError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Failed to check webhook event',
        },
        {
          status: 500,
        }
      );
    }

    if (existingEvent) {
      console.log(
        '[Razorpay Webhook] Duplicate event, skipping:',
        eventId
      );

      return NextResponse.json({
        success: true,
        message:
          'Event already processed',
      });
    }

    // ==========================================================
    // 9. CREATE PAYLOAD HASH
    // ==========================================================

    const payloadHash = crypto
      .createHash('sha256')
      .update(body)
      .digest('hex');

    // ==========================================================
    // 10. STORE WEBHOOK EVENT
    // ==========================================================

    const {
      error: insertEventError,
    } = await supabase
      .from('payment_webhook_events')
      .insert({
        gateway: 'razorpay',

        event_id: eventId,

        event_type: eventType,

        payload_hash: payloadHash,

        processing_status: 'processing',
      });

    if (insertEventError) {
      // --------------------------------------------------------
      // Duplicate event race condition
      // --------------------------------------------------------

      if (
        insertEventError.code ===
        '23505' ||
        insertEventError.message
          ?.toLowerCase()
          .includes('duplicate')
      ) {
        console.log(
          '[Razorpay Webhook] Duplicate event detected during insert:',
          eventId
        );

        return NextResponse.json({
          success: true,
          message:
            'Event already processed',
        });
      }

      console.error(
        '[Razorpay Webhook] Failed to store webhook event:',
        insertEventError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Failed to store webhook event',
        },
        {
          status: 500,
        }
      );
    }

    // ==========================================================
    // 11. HANDLE WEBHOOK THROUGH ADAPTER
    // ==========================================================

    const adapter =
      createGatewayAdapter('razorpay');

    const result =
      await adapter.handleWebhook({
        gateway: 'razorpay',

        event_id: eventId,

        event_type: eventType,

        payload,

        signature,
      });

    if (!result.success) {
      console.error(
        '[Razorpay Webhook] Adapter processing failed:',
        result.error
      );

      await supabase
        .from('payment_webhook_events')
        .update({
          processing_status: 'failed',
        })
        .eq('gateway', 'razorpay')
        .eq('event_id', eventId);

      return NextResponse.json(
        {
          success: false,
          error:
            result.error ||
            'Webhook processing failed',
        },
        {
          status: 500,
        }
      );
    }

    // ==========================================================
    // 12. EXTRACT RAZORPAY PAYMENT / ORDER DATA
    // ==========================================================

    const razorpayPayment =
      payload?.payload?.payment?.entity ||
      null;

    const razorpayOrder =
      payload?.payload?.order?.entity ||
      null;

    const razorpayOrderId =
      razorpayPayment?.order_id ||
      razorpayOrder?.id ||
      null;

    const razorpayPaymentId =
      razorpayPayment?.id ||
      (
        eventType === 'order.paid'
          ? null
          : result.payment_id
      ) ||
      null;

    // ==========================================================
    // Razorpay notes
    //
    // createOrder() puts booking_id into notes.
    // ==========================================================

    const razorpayBookingId =
      razorpayPayment?.notes?.booking_id ||
      razorpayOrder?.notes?.booking_id ||
      null;

    console.log(
      '[Razorpay Webhook] Razorpay identifiers:',
      {
        eventType,

        razorpayOrderId,

        razorpayPaymentId,

        razorpayBookingId,

        adapterPaymentId:
          result.payment_id,
      }
    );

    // ==========================================================
    // 13. FIND INTERNAL PAYMENT RECORD
    // ==========================================================

    let payment: any = null;

    // ----------------------------------------------------------
    // LOOKUP 1
    //
    // Razorpay Order ID
    // ->
    // payments.gateway_order_id
    // ----------------------------------------------------------

    if (razorpayOrderId) {
      const {
        data: paymentByOrder,
        error: paymentLookupError,
      } = await supabase
        .from('payments')
        .select('*')
        .eq('gateway', 'razorpay')
        .eq(
          'gateway_order_id',
          razorpayOrderId
        )
        .order('created_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (paymentLookupError) {
        console.error(
          '[Razorpay Webhook] Payment lookup by order ID failed:',
          paymentLookupError
        );
      } else if (paymentByOrder) {
        payment = paymentByOrder;

        console.log(
          '[Razorpay Webhook] Payment matched by gateway_order_id:',
          payment.id
        );
      }
    }

    // ----------------------------------------------------------
    // LOOKUP 2
    //
    // Razorpay Payment ID
    // ->
    // payments.gateway_payment_id
    // ----------------------------------------------------------

    if (
      !payment &&
      razorpayPaymentId
    ) {
      const {
        data: paymentByGatewayPaymentId,
        error: paymentLookupError,
      } = await supabase
        .from('payments')
        .select('*')
        .eq('gateway', 'razorpay')
        .eq(
          'gateway_payment_id',
          razorpayPaymentId
        )
        .order('created_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (paymentLookupError) {
        console.error(
          '[Razorpay Webhook] Payment lookup by gateway payment ID failed:',
          paymentLookupError
        );
      } else if (
        paymentByGatewayPaymentId
      ) {
        payment =
          paymentByGatewayPaymentId;

        console.log(
          '[Razorpay Webhook] Payment matched by gateway_payment_id:',
          payment.id
        );
      }
    }

    // ----------------------------------------------------------
    // LOOKUP 3
    //
    // Booking ID from Razorpay notes
    // ->
    // payments.booking_id
    // ----------------------------------------------------------

    if (
      !payment &&
      razorpayBookingId
    ) {
      const {
        data: paymentByBooking,
        error: bookingLookupError,
      } = await supabase
        .from('payments')
        .select('*')
        .eq('gateway', 'razorpay')
        .eq(
          'booking_id',
          razorpayBookingId
        )
        .in('status', [
          'created',
          'checkout_started',
          'pending',
        ])
        .order('created_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (bookingLookupError) {
        console.error(
          '[Razorpay Webhook] Payment lookup by booking ID failed:',
          bookingLookupError
        );
      } else if (paymentByBooking) {
        payment = paymentByBooking;

        console.log(
          '[Razorpay Webhook] Payment matched by booking ID:',
          {
            internalPaymentId:
              payment.id,

            bookingId:
              razorpayBookingId,
          }
        );
      }
    }

    // ----------------------------------------------------------
    // LOOKUP 4
    //
    // Adapter payment ID may actually be our internal
    // payment ID in some older implementation.
    // ----------------------------------------------------------

    if (
      !payment &&
      result.payment_id
    ) {
      const {
        data: paymentByInternalId,
        error: paymentByInternalIdError,
      } = await supabase
        .from('payments')
        .select('*')
        .eq(
          'id',
          result.payment_id
        )
        .maybeSingle();

      if (paymentByInternalIdError) {
        console.error(
          '[Razorpay Webhook] Payment lookup by internal ID failed:',
          paymentByInternalIdError
        );
      } else if (
        paymentByInternalId
      ) {
        payment =
          paymentByInternalId;

        console.log(
          '[Razorpay Webhook] Payment matched by internal payment ID:',
          payment.id
        );
      }
    }

    // ==========================================================
    // 14. PROCESS PAYMENT STATUS
    // ==========================================================

    if (
      payment &&
      result.status
    ) {
      console.log(
        '[Razorpay Webhook] Processing payment:',
        {
          internalPaymentId:
            payment.id,

          razorpayOrderId,

          razorpayPaymentId,

          status:
            result.status,
        }
      );

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      if (
        result.status ===
        'success'
      ) {
        // For payment.captured we have actual Razorpay payment ID.
        //
        // For order.paid, payment ID may not be present.
        // In that case do not overwrite gateway_payment_id
        // with the order ID.
        if (razorpayPaymentId) {
          await PaymentService
            .processSuccessfulPayment(
              payment.id,

              razorpayPaymentId,

              'razorpay'
            );
        } else {
          console.warn(
            '[Razorpay Webhook] Success event has no payment ID:',
            {
              eventType,
              internalPaymentId:
                payment.id,
              razorpayOrderId,
            }
          );

          // Still mark payment successful.
          // This fallback is mainly for order.paid.
          const {
            error: paymentUpdateError,
          } = await supabase
            .from('payments')
            .update({
              status: 'success',

              paid_at:
                new Date().toISOString(),
            })
            .eq(
              'id',
              payment.id
            );

          if (paymentUpdateError) {
            console.error(
              '[Razorpay Webhook] Failed to update payment:',
              paymentUpdateError
            );
          }

          if (payment.booking_id) {
            await supabase
              .from('bookings')
              .update({
                payment_status:
                  'paid',
              })
              .eq(
                'id',
                payment.booking_id
              );
          }

          if (
            payment.combo_booking_id
          ) {
            await supabase
              .from('combo_bookings')
              .update({
                payment_status:
                  'paid',
              })
              .eq(
                'id',
                payment.combo_booking_id
              );
          }
        }
      }

      // --------------------------------------------------------
      // FAILED
      // --------------------------------------------------------

      else if (
        result.status ===
        'failed'
      ) {
        const failureReason =
          razorpayPayment
            ?.error_description ||
          razorpayPayment
            ?.error_reason ||
          razorpayPayment
            ?.error_code ||
          'Payment failed';

        await PaymentService
          .processFailedPayment(
            payment.id,

            failureReason
          );
      }
    }

    // ==========================================================
    // PAYMENT NOT FOUND
    // ==========================================================

    if (!payment) {
      console.warn(
        '[Razorpay Webhook] No matching payment record found:',
        {
          eventId,

          eventType,

          razorpayOrderId,

          razorpayPaymentId,

          razorpayBookingId,

          adapterPaymentId:
            result.payment_id,

          notes:
            razorpayPayment?.notes ||
            razorpayOrder?.notes ||
            null,
        }
      );
    }

    // ==========================================================
    // 15. MARK WEBHOOK COMPLETED
    // ==========================================================

    const {
      error: completeEventError,
    } = await supabase
      .from('payment_webhook_events')
      .update({
        processing_status:
          'completed',

        processed_at:
          new Date().toISOString(),
      })
      .eq(
        'gateway',
        'razorpay'
      )
      .eq(
        'event_id',
        eventId
      );

    if (completeEventError) {
      console.error(
        '[Razorpay Webhook] Failed to mark event completed:',
        completeEventError
      );
    }

    // ==========================================================
    // 16. SUCCESS RESPONSE
    // ==========================================================

    console.log(
      '[Razorpay Webhook] Successfully processed:',
      {
        eventId,

        eventType,

        matchedPaymentId:
          payment?.id || null,
      }
    );

    return NextResponse.json({
      success: true,

      event_id: eventId,

      event_type: eventType,

      payment_id:
        payment?.id || null,
    });
  } catch (error: any) {
    console.error(
      '[Razorpay Webhook] Error:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          'Webhook processing failed',
      },
      {
        status: 500,
      }
    );
  }
}