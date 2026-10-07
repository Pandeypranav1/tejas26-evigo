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

function getValidatedPaymentMethod(value: unknown): PaymentMethod | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return VALID_PAYMENT_METHODS.has(normalized as PaymentMethod)
    ? (normalized as PaymentMethod)
    : null;
}

/**
 * Safely convert a possible amount into a positive number.
 */
function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
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

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

/**
 * Resolve the actual booking amount.
 *
 * We only use values already present on the booking.
 * We never silently invent a price here.
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

/**
 * Get the correct Razorpay public key for the current environment.
 *
 * This is only used when reusing an already-created Razorpay order.
 */
function getRazorpayPublicKey(): string | null {
  const environment = process.env.PAYMENT_ENV || 'sandbox';

  const key =
    environment === 'production'
      ? process.env.RAZORPAY_KEY_ID || ''
      : process.env.RAZORPAY_KEY_ID_SANDBOX || '';

  return key.trim() || null;
}

/**
 * Build checkout data for an existing Razorpay payment.
 *
 * Razorpay expects amount in paise.
 */
function buildExistingRazorpayCheckout(
  payment: Record<string, any>,
  amount: number
) {
  const gatewayOrderId =
    typeof payment.gateway_order_id === 'string'
      ? payment.gateway_order_id.trim()
      : '';

  if (!gatewayOrderId) {
    return null;
  }

  const key = getRazorpayPublicKey();

  if (!key) {
    return null;
  }

  return {
    key,
    order_id: gatewayOrderId,
    amount: Math.round(amount * 100),
    currency: payment.currency || 'INR',
    prefill: {
      name: payment.customer_name || undefined,
      email: payment.customer_email || undefined,
      contact: payment.customer_phone || undefined,
    },
  };
}

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  try {
    // =========================================================
    // 1. AUTHENTICATION
    // =========================================================

    const authResult = await getAuthenticatedUser();

    const user = authResult.user;

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        },
        { status: 401 }
      );
    }

    // =========================================================
    // 2. PARSE REQUEST
    // =========================================================

    let body: any = {};

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          code: 'INVALID_REQUEST_BODY',
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 3. VALIDATE PAYMENT METHOD
    // =========================================================

    const payment_method = getValidatedPaymentMethod(
      body?.payment_method ?? 'upi'
    );

    if (!payment_method) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported payment method',
          code: 'UNSUPPORTED_PAYMENT_METHOD',
        },
        { status: 400 }
      );
    }

    const supabase: any = createAdminClient();

    // =========================================================
    // 4. LOAD BOOKING
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
          code: 'BOOKING_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // =========================================================
    // 5. OWNERSHIP CHECK
    // =========================================================

    if (booking.client_id !== user.id) {
      console.warn(
        '[POST /api/bookings/:id/initiate-payment] Unauthorized booking access:',
        {
          bookingId,
          userId: user.id,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Not authorized',
          code: 'NOT_AUTHORIZED',
        },
        { status: 403 }
      );
    }

    // =========================================================
    // 6. PREVENT PAYMENT FOR ALREADY-PAID BOOKING
    // =========================================================

    if (booking.payment_status === 'paid') {
      console.log(
        '[POST /api/bookings/:id/initiate-payment] Booking already paid:',
        {
          bookingId,
        }
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
    // 7. RESOLVE BOOKING AMOUNT
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

    if (!Number.isFinite(amount) || amount <= 0) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Invalid booking amount:',
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
    // 8. CHECK EXISTING NON-TERMINAL PAYMENT
    // =========================================================
    //
    // This protects against accidental double-clicks/retries.
    //
    // We only reuse the existing payment when we have enough
    // information to build a valid checkout payload.
    // =========================================================

    const {
      data: existingPayment,
      error: existingPaymentError,
    } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .in('status', [
        'created',
        'checkout_started',
        'pending',
        'processing',
      ])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPaymentError) {
      console.warn(
        '[POST /api/bookings/:id/initiate-payment] Existing payment lookup warning:',
        existingPaymentError.message
      );
    }

    if (existingPayment) {
      const existingAmount = parseAmount(existingPayment.amount);

      const gateway =
        typeof existingPayment.gateway === 'string'
          ? existingPayment.gateway.toLowerCase()
          : '';

      console.log(
        '[POST /api/bookings/:id/initiate-payment] Existing payment found:',
        {
          bookingId,
          paymentId: existingPayment.id,
          gateway,
          status: existingPayment.status,
          gatewayOrderId: existingPayment.gateway_order_id || null,
        }
      );

      // -------------------------------------------------------
      // Razorpay existing order
      // -------------------------------------------------------

      if (
        gateway === 'razorpay' &&
        existingAmount !== null &&
        existingPayment.gateway_order_id
      ) {
        const checkoutData = buildExistingRazorpayCheckout(
          existingPayment,
          existingAmount
        );

        if (checkoutData) {
          console.log(
            '[POST /api/bookings/:id/initiate-payment] Reusing existing Razorpay order:',
            {
              bookingId,
              paymentId: existingPayment.id,
              orderId: existingPayment.gateway_order_id,
            }
          );

          return NextResponse.json({
            success: true,
            payment_id: existingPayment.id,
            checkout_data: checkoutData,
            amount: existingAmount,
            is_existing: true,
          });
        }

        console.warn(
          '[POST /api/bookings/:id/initiate-payment] Existing Razorpay payment found but checkout data could not be rebuilt. Creating a fresh payment.'
        );
      }

      // -------------------------------------------------------
      // Do not return incomplete checkout data.
      //
      // The previous implementation returned only:
      //
      // { order_id: ... }
      //
      // which caused the frontend to receive incomplete
      // Razorpay checkout information.
      // -------------------------------------------------------
      console.warn(
        '[POST /api/bookings/:id/initiate-payment] Existing payment cannot be safely reused. A new payment order will be created.'
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
      .select('full_name, phone, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
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
    // 10. CREATE PAYMENT
    // =========================================================

    console.log(
      '[POST /api/bookings/:id/initiate-payment] Creating payment:',
      {
        bookingId,
        userId: user.id,
        amount,
        currency: 'INR',
        payment_method,
      }
    );

    const result = await PaymentService.createPayment({
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

        booking_amount_source: 'booking_record',

        booking_id: bookingId,
      },
    });

    // =========================================================
    // 11. PAYMENT SERVICE FAILURE
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
            'Failed to create payment. Please try again.',
          code: 'PAYMENT_CREATION_FAILED',
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 12. VALIDATE PAYMENT RESPONSE
    // =========================================================

    if (!result.payment_id) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Payment created without payment_id:',
        {
          bookingId,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Payment was created without a payment reference.',
          code: 'PAYMENT_ID_MISSING',
        },
        { status: 500 }
      );
    }

    if (!result.checkout_data) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Missing checkout_data:',
        {
          bookingId,
          paymentId: result.payment_id,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Payment order was created but checkout information is missing.',
          code: 'CHECKOUT_DATA_MISSING',
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 13. VALIDATE RAZORPAY CHECKOUT DATA
    // =========================================================

    const checkoutData = result.checkout_data;

    if (checkoutData.key && !checkoutData.order_id) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Razorpay checkout_data missing order_id:',
        {
          bookingId,
          paymentId: result.payment_id,
          checkoutData,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Razorpay order was created but the order ID is missing.',
          code: 'RAZORPAY_ORDER_ID_MISSING',
        },
        { status: 500 }
      );
    }

    if (checkoutData.key) {
      const checkoutAmountPaise = Number(checkoutData.amount);

      const expectedAmountPaise = Math.round(amount * 100);

      if (
        !Number.isFinite(checkoutAmountPaise) ||
        checkoutAmountPaise <= 0
      ) {
        console.error(
          '[POST /api/bookings/:id/initiate-payment] Invalid Razorpay checkout amount:',
          {
            bookingId,
            paymentId: result.payment_id,
            checkoutAmount: checkoutData.amount,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error: 'Invalid Razorpay payment amount.',
            code: 'INVALID_RAZORPAY_AMOUNT',
          },
          { status: 500 }
        );
      }

      if (checkoutAmountPaise !== expectedAmountPaise) {
        console.error(
          '[POST /api/bookings/:id/initiate-payment] Razorpay amount mismatch:',
          {
            bookingId,
            paymentId: result.payment_id,
            expectedAmountPaise,
            checkoutAmountPaise,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              'Payment amount mismatch. Please restart the payment.',
            code: 'RAZORPAY_AMOUNT_MISMATCH',
          },
          { status: 500 }
        );
      }
    }

    // =========================================================
    // 14. IMPORTANT
    // =========================================================
    //
    // DO NOT update:
    //
    // bookings.payment_id
    //
    // because that column does not exist in the current
    // bookings schema.
    //
    // The payment is already linked through:
    //
    // payments.booking_id = bookingId
    //
    // PaymentService and webhook processing use that relation.
    //
    // This removes the PGRST204 error permanently.
    // =========================================================

    console.log(
      '[POST /api/bookings/:id/initiate-payment] PAYMENT CHECKOUT READY:',
      {
        bookingId,
        paymentId: result.payment_id,
        amount,
        gatewayOrderId:
          checkoutData.order_id ||
          checkoutData.order_token ||
          null,
      }
    );

    // =========================================================
    // 15. FINAL RESPONSE
    // =========================================================

    return NextResponse.json({
      success: true,
      payment_id: result.payment_id,
      checkout_data: checkoutData,
      amount,
      is_existing: false,
    });
  } catch (error: any) {
    console.error(
      '[POST /api/bookings/:id/initiate-payment] Unexpected error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          'Unable to initiate payment. Please try again.',
        code: 'PAYMENT_INITIATION_ERROR',
      },
      { status: 500 }
    );
  }
}