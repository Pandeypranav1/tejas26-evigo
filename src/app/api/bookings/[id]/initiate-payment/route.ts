import { NextResponse } from 'next/server';

import { getAuthenticatedUser } from '@/lib/server';
import { createAdminClient } from '@/lib/supabase';
import { PaymentService } from '@/lib/payment/service';
import { PaymentMethod } from '@/lib/payment/types';

const VALID_PAYMENT_METHODS = new Set<PaymentMethod>([
  'upi',
  'card',
  'netbanking',
  'wallet',
  'emi',
]);

function getValidatedPaymentMethod(
  value: unknown
): PaymentMethod | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return VALID_PAYMENT_METHODS.has(
    normalized as PaymentMethod
  )
    ? (normalized as PaymentMethod)
    : null;
}

/**
 * Safely convert a possible booking/payment amount
 * into a positive number.
 *
 * Supports:
 * 500
 * "500"
 * "₹500"
 * "500.00"
 * "₹1,500.00"
 */
function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0
      ? value
      : null;
  }

  if (typeof value === 'string') {
    const cleaned = value
      .replace(/₹/g, '')
      .replace(/,/g, '')
      .trim();

    if (!cleaned) {
      return null;
    }

    const parsed = Number(cleaned);

    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : null;
  }

  return null;
}

/**
 * Resolve the actual confirmed booking amount.
 *
 * We intentionally do not invent a fallback amount.
 */
function resolveBookingAmount(
  booking: Record<string, any>
): number | null {
  const possibleAmountFields = [
    'amount',
    'total_amount',
    'final_amount',
    'price',
    'total_price',
    'booking_amount',
    'fare',
    'total_fare',
    'estimated_fare',
    'final_fare',
    'base_fare',
  ];

  for (const field of possibleAmountFields) {
    const amount = parseAmount(booking[field]);

    if (amount !== null) {
      console.log(
        `[POST /api/bookings/:id/initiate-payment] Using booking amount from field "${field}":`,
        amount
      );

      return amount;
    }
  }

  return null;
}

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  const { id: bookingId } = await params;

  let user: any = null;

  try {
    // =========================================================
    // 1. AUTHENTICATION
    // =========================================================

    const authResult = await getAuthenticatedUser();

    user = authResult.user;

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // =========================================================
    // 2. PARSE REQUEST BODY
    // =========================================================

    let body: any = {};

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 3. VALIDATE PAYMENT METHOD
    // =========================================================

    const payment_method =
      getValidatedPaymentMethod(
        body?.payment_method ?? 'upi'
      );

    if (!payment_method) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported payment method',
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // =========================================================
    // 4. GET BOOKING
    // =========================================================

    const {
      data: booking,
      error: bookingError,
    } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Booking lookup failed:',
        {
          bookingId,
          error: bookingError?.message,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Booking not found',
        },
        { status: 404 }
      );
    }

    // =========================================================
    // 5. VERIFY BOOKING OWNERSHIP
    // =========================================================

    if (booking.client_id !== user.id) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Booking ownership mismatch:',
        {
          bookingId,
          bookingClientId: booking.client_id,
          userId: user.id,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Not authorized',
        },
        { status: 403 }
      );
    }

    // =========================================================
    // 6. PREVENT DUPLICATE SUCCESSFUL PAYMENT
    // =========================================================

    if (booking.payment_status === 'paid') {
      console.log(
        '[POST /api/bookings/:id/initiate-payment] Booking already paid:',
        bookingId
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Booking already paid',
          code: 'BOOKING_ALREADY_PAID',
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 7. RESOLVE ACTUAL BOOKING AMOUNT
    // =========================================================

    const amount = resolveBookingAmount(booking);

    console.log(
      '[POST /api/bookings/:id/initiate-payment] Resolved payment amount:',
      {
        bookingId,
        amount,
        bookingAmount: booking.amount,
        totalAmount: booking.total_amount,
        finalAmount: booking.final_amount,
        price: booking.price,
        totalPrice: booking.total_price,
        bookingAmountField: booking.booking_amount,
        fare: booking.fare,
        totalFare: booking.total_fare,
        estimatedFare: booking.estimated_fare,
        finalFare: booking.final_fare,
        baseFare: booking.base_fare,
      }
    );

    if (amount === null) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] No valid booking amount found:',
        {
          bookingId,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Booking price is not confirmed yet. Please wait until the booking amount is available before making payment.',
          code: 'BOOKING_AMOUNT_MISSING',
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 8. HANDLE EXISTING NON-TERMINAL PAYMENTS
    //
    // IMPORTANT:
    //
    // Previously we returned an existing payment with only:
    //
    // {
    //   order_id: existingPayment.gateway_order_id
    // }
    //
    // That is NOT enough for Razorpay Checkout.
    //
    // Razorpay Checkout needs:
    //
    // key
    // order_id
    // amount
    // currency
    //
    // Therefore we NEVER reuse an incomplete old payment
    // for a new checkout.
    //
    // Instead:
    //
    // old payment
    //      ↓
    // mark failed
    //      ↓
    // create fresh payment
    //      ↓
    // fresh Razorpay order
    //      ↓
    // complete checkout_data
    // =========================================================

    const {
      data: existingPayments,
      error: existingPaymentError,
    } = await supabase
      .from('payments')
      .select(
        'id, amount, status, gateway, selected_gateway, gateway_order_id, gateway_payment_id, created_at'
      )
      .eq('booking_id', bookingId)
      .in('status', [
        'created',
        'checkout_started',
        'pending',
      ])
      .order('created_at', {
        ascending: false,
      })
      .limit(10);

    if (existingPaymentError) {
      console.warn(
        '[POST /api/bookings/:id/initiate-payment] Existing payment lookup warning:',
        existingPaymentError.message
      );
    }

    if (
      existingPayments &&
      existingPayments.length > 0
    ) {
      console.log(
        '[POST /api/bookings/:id/initiate-payment] Existing non-terminal payments found:',
        existingPayments.map((payment) => ({
          paymentId: payment.id,
          status: payment.status,
          gateway: payment.gateway,
          selectedGateway:
            payment.selected_gateway,
          gatewayOrderId:
            payment.gateway_order_id,
          hasGatewayPaymentId:
            Boolean(
              payment.gateway_payment_id
            ),
          amount: payment.amount,
          createdAt: payment.created_at,
        }))
      );

      for (const existingPayment of existingPayments) {
        // -------------------------------------------------------
        // If a real gateway payment ID already exists, do NOT
        // automatically create another payment.
        //
        // The gateway may still be processing that payment.
        // -------------------------------------------------------

        if (
          existingPayment.gateway_payment_id
        ) {
          console.warn(
            '[POST /api/bookings/:id/initiate-payment] Existing payment has gateway payment ID; payment is already being processed:',
            {
              paymentId: existingPayment.id,
              gatewayPaymentId:
                existingPayment.gateway_payment_id,
              status: existingPayment.status,
            }
          );

          return NextResponse.json(
            {
              success: false,
              error:
                'A payment is already being processed for this booking. Please wait a moment and refresh the page.',
              code:
                'PAYMENT_ALREADY_PROCESSING',
              payment_id:
                existingPayment.id,
            },
            { status: 409 }
          );
        }

        // -------------------------------------------------------
        // Old payment has no gateway payment ID.
        //
        // It is safe to mark it failed and create a fresh
        // payment attempt.
        // -------------------------------------------------------

        const existingAmount = parseAmount(
          existingPayment.amount
        );

        console.warn(
          '[POST /api/bookings/:id/initiate-payment] Superseding stale payment:',
          {
            paymentId: existingPayment.id,
            status: existingPayment.status,
            amount: existingAmount,
            gatewayOrderId:
              existingPayment.gateway_order_id,
          }
        );

        const {
          error: stalePaymentError,
        } = await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason:
              'Previous checkout attempt was incomplete and was superseded by a fresh checkout attempt.',
            failed_at:
              new Date().toISOString(),
          })
          .eq('id', existingPayment.id)
          .in('status', [
            'created',
            'checkout_started',
            'pending',
          ]);

        if (stalePaymentError) {
          console.error(
            '[POST /api/bookings/:id/initiate-payment] Failed to close stale payment:',
            {
              paymentId:
                existingPayment.id,
              error:
                stalePaymentError.message,
            }
          );

          return NextResponse.json(
            {
              success: false,
              error:
                'Unable to reset the previous payment attempt. Please try again.',
              code:
                'STALE_PAYMENT_RESET_FAILED',
            },
            { status: 500 }
          );
        }

        // -------------------------------------------------------
        // Best-effort cleanup of old payment attempt.
        //
        // This is intentionally non-blocking. The new payment
        // must not depend on the old attempt being updated.
        // -------------------------------------------------------

        try {
          const {
            error: attemptCleanupError,
          } = await supabase
            .from('payment_attempts')
            .update({
              status: 'failed',
              error_message:
                'Payment attempt superseded by a fresh checkout attempt.',
              completed_at:
                new Date().toISOString(),
            })
            .eq(
              'payment_id',
              existingPayment.id
            )
            .in('status', [
              'started',
              'order_created',
              'processing',
            ]);

          if (attemptCleanupError) {
            console.warn(
              '[POST /api/bookings/:id/initiate-payment] Old payment attempt cleanup warning:',
              {
                paymentId:
                  existingPayment.id,
                error:
                  attemptCleanupError.message,
              }
            );
          }
        } catch (attemptCleanupException: any) {
          console.warn(
            '[POST /api/bookings/:id/initiate-payment] Old payment attempt cleanup exception:',
            {
              paymentId:
                existingPayment.id,
              error:
                attemptCleanupException?.message,
            }
          );
        }
      }

      console.log(
        '[POST /api/bookings/:id/initiate-payment] Old payment attempts cleared. A fresh payment will be created.'
      );
    }

    // =========================================================
    // 9. GET CUSTOMER PROFILE
    // =========================================================

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select(
        'full_name, phone, email'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (
      profileError &&
      profileError.code !== 'PGRST116'
    ) {
      console.warn(
        '[POST /api/bookings/:id/initiate-payment] Profile query warning:',
        profileError.message
      );
    }

    const customerName =
      booking.customer_name ||
      profile?.full_name ||
      user.user_metadata?.full_name ||
      'Customer';

    const customerPhone =
      booking.customer_phone ||
      profile?.phone ||
      user.phone ||
      '';

    const customerEmail =
      booking.customer_email ||
      profile?.email ||
      user.email ||
      '';

    // =========================================================
    // 10. FINAL AMOUNT SAFETY CHECK
    // =========================================================

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Invalid final amount:',
        {
          bookingId,
          amount,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid booking amount',
          code: 'INVALID_BOOKING_AMOUNT',
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 11. CREATE FRESH PAYMENT
    // =========================================================

    console.log(
      '[POST /api/bookings/:id/initiate-payment] Creating fresh payment:',
      {
        bookingId,
        userId: user.id,
        amount,
        currency: 'INR',
        payment_method,
      }
    );

    const result =
      await PaymentService.createPayment({
        user_id: user.id,

        amount,

        currency: 'INR',

        payment_method,

        customer_name: customerName,

        customer_email: customerEmail,

        customer_phone: customerPhone,

        booking_id: bookingId,

        metadata: {
          service_type:
            booking.service_type ||
            booking.transport_service ||
            null,

          provider_name:
            booking.provider_name ||
            null,

          booking_amount_source:
            'booking_record',

          checkout_retry:
            existingPayments &&
            existingPayments.length > 0,
        },
      });

    // =========================================================
    // 12. PAYMENT SERVICE FAILURE
    // =========================================================

    if (!result.success) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] PaymentService failed:',
        {
          bookingId,
          amount,
          error: result.error,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            result.error ||
            'Failed to create payment',
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 13. STRICT CHECKOUT DATA VALIDATION
    //
    // Do NOT return success to frontend if the gateway did not
    // give us complete checkout data.
    // =========================================================

    const checkoutData =
      result.checkout_data as
      | Record<string, any>
      | null
      | undefined;

    const checkoutKey =
      checkoutData?.key;

    const checkoutOrderId =
      checkoutData?.order_id;

    const checkoutAmount =
      parseAmount(checkoutData?.amount);

    const checkoutCurrency =
      checkoutData?.currency || 'INR';

    console.log(
      '[POST /api/bookings/:id/initiate-payment] Gateway checkout data received:',
      {
        paymentId: result.payment_id,
        hasKey: Boolean(checkoutKey),
        hasOrderId: Boolean(checkoutOrderId),
        amount: checkoutAmount,
        currency: checkoutCurrency,
      }
    );

    if (
      !checkoutData ||
      typeof checkoutData !== 'object' ||
      typeof checkoutKey !== 'string' ||
      !checkoutKey.trim() ||
      typeof checkoutOrderId !== 'string' ||
      !checkoutOrderId.trim() ||
      checkoutAmount === null ||
      checkoutAmount <= 0
    ) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Gateway returned incomplete checkout data:',
        {
          paymentId: result.payment_id,
          checkoutDataKeys:
            checkoutData
              ? Object.keys(checkoutData)
              : [],
          hasKey: Boolean(checkoutKey),
          hasOrderId:
            Boolean(checkoutOrderId),
          checkoutAmount,
          checkoutCurrency,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Payment gateway returned incomplete checkout data. Please try again.',
          code:
            'INCOMPLETE_CHECKOUT_DATA',
        },
        { status: 502 }
      );
    }

    // =========================================================
    // 14. VERIFY ORDER/AMOUNT CONSISTENCY
    // =========================================================

    if (
      Math.round(checkoutAmount * 100) !==
      Math.round(amount * 100)
    ) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Gateway amount mismatch:',
        {
          paymentId: result.payment_id,
          bookingAmount: amount,
          checkoutAmount,
          checkoutOrderId,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Payment amount mismatch. Please try again.',
          code:
            'CHECKOUT_AMOUNT_MISMATCH',
        },
        { status: 502 }
      );
    }

    // =========================================================
    // 15. SAVE PAYMENT REFERENCE TO BOOKING
    // =========================================================

    const {
      error: bookingUpdateError,
    } = await supabase
      .from('bookings')
      .update({
        payment_id: result.payment_id,
      })
      .eq('id', bookingId);

    if (bookingUpdateError) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Failed to update booking payment_id:',
        bookingUpdateError
      );

      // Payment was already created successfully.
      // We still return the complete checkout data so the
      // customer is not blocked from paying.
      return NextResponse.json({
        success: true,

        payment_id: result.payment_id,

        checkout_data: {
          ...checkoutData,

          key: checkoutKey,

          order_id: checkoutOrderId,

          amount: checkoutAmount,

          currency: checkoutCurrency,
        },

        amount,

        warning:
          'Payment created but booking payment reference could not be updated.',
      });
    }

    // =========================================================
    // 16. FINAL SUCCESS RESPONSE
    // =========================================================

    console.log(
      '[POST /api/bookings/:id/initiate-payment] Returning fresh checkout data:',
      {
        bookingId,
        paymentId: result.payment_id,
        orderId: checkoutOrderId,
        amount: checkoutAmount,
        currency: checkoutCurrency,
      }
    );

    return NextResponse.json({
      success: true,

      payment_id: result.payment_id,

      checkout_data: {
        ...checkoutData,

        key: checkoutKey,

        order_id: checkoutOrderId,

        amount: checkoutAmount,

        currency: checkoutCurrency,
      },

      amount,
    });
  } catch (error: any) {
    console.error(
      '[POST /api/bookings/:id/initiate-payment] Unexpected error:',
      {
        bookingId,
        userId: user?.id,
        error: error?.message,
        stack: error?.stack,
      }
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          'Payment service temporarily unavailable. Please try again.',
      },
      { status: 500 }
    );
  }
}