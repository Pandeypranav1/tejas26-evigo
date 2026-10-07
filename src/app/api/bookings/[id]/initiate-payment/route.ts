import { NextResponse } from 'next/server';

import { getAuthenticatedUser } from '@/lib/server';
import { createAdminClient } from '@/lib/supabase';
import { PaymentService } from '@/lib/payment/service';
import { PaymentMethod } from '@/lib/payment/types';

/**
 * ============================================================
 * FAABCAB PAYMENT CONFIGURATION
 * ============================================================
 *
 * Current FaabCab booking flow does not store a dynamic fare
 * in the booking record.
 *
 * Until dynamic pricing is connected to the booking record,
 * the current confirmed FaabCab payment amount is ₹500.
 *
 * IMPORTANT:
 * This is SERVER-SIDE and is never trusted from the browser.
 */
const FAABCAB_PAYMENT_AMOUNT = 500;

const VALID_PAYMENT_METHODS = new Set<PaymentMethod>([
  'upi',
  'card',
  'netbanking',
  'wallet',
  'emi',
]);

/**
 * Safely convert a possible rupee amount into a positive number.
 *
 * This helper is used for DATABASE amounts, which are stored
 * in rupees.
 */
function parseRupeeAmount(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) &&
      value > 0
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

    return Number.isFinite(parsed) &&
      parsed > 0
      ? parsed
      : null;
  }

  return null;
}

/**
 * Validate payment method.
 */
function getValidatedPaymentMethod(
  value: unknown
): PaymentMethod | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized =
    value.trim().toLowerCase();

  return VALID_PAYMENT_METHODS.has(
    normalized as PaymentMethod
  )
    ? (normalized as PaymentMethod)
    : null;
}

/**
 * Resolve booking amount in RUPEES.
 *
 * Example:
 *
 * booking.amount = 500
 *
 * returns:
 *
 * {
 *   amount: 500,
 *   source: "booking.amount"
 * }
 *
 * If no booking amount exists, current FaabCab
 * server-side amount of ₹500 is used.
 */
function resolveBookingAmount(
  booking: Record<string, any>
): {
  amount: number;
  source: string;
} {
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

  for (
    const field of possibleAmountFields
  ) {
    const parsed =
      parseRupeeAmount(
        booking?.[field]
      );

    if (parsed !== null) {
      return {
        amount: parsed,
        source: `booking.${field}`,
      };
    }
  }

  return {
    amount:
      FAABCAB_PAYMENT_AMOUNT,
    source:
      'faabcab-server-default',
  };
}

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const {
    id: bookingId,
  } = await params;

  let user: any = null;

  try {
    // ========================================================
    // 1. AUTHENTICATION
    // ========================================================

    const authResult =
      await getAuthenticatedUser();

    user = authResult.user;

    if (!user) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Authentication required'
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Authentication required',
        },
        { status: 401 }
      );
    }

    // ========================================================
    // 2. REQUEST BODY
    // ========================================================

    let body: any = {};

    try {
      body =
        await request.json();
    } catch {
      body = {};
    }

    // ========================================================
    // 3. PAYMENT METHOD
    // ========================================================

    const payment_method =
      getValidatedPaymentMethod(
        body?.payment_method ??
        'upi'
      );

    if (!payment_method) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unsupported payment method',
        },
        { status: 400 }
      );
    }

    /**
     * The current generated Supabase types can incorrectly
     * infer GenericStringError for these payment queries.
     *
     * We intentionally use an admin client typed as any in
     * this route so the runtime query result is not blocked
     * by the generated type issue.
     */
    const supabase: any =
      createAdminClient();

    // ========================================================
    // 4. LOAD BOOKING
    // ========================================================

    const {
      data: booking,
      error: bookingError,
    } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (
      bookingError ||
      !booking
    ) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Booking lookup failed:',
        {
          bookingId,
          error:
            bookingError?.message,
          code:
            bookingError?.code,
          details:
            bookingError?.details,
          hint:
            bookingError?.hint,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Booking not found',
        },
        { status: 404 }
      );
    }

    // ========================================================
    // 5. OWNERSHIP CHECK
    // ========================================================

    if (
      booking.client_id !==
      user.id
    ) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Ownership mismatch:',
        {
          bookingId,
          bookingClientId:
            booking.client_id,
          userId:
            user.id,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Not authorized',
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 6. ALREADY PAID CHECK
    // ========================================================

    if (
      booking.payment_status ===
      'paid'
    ) {
      console.log(
        '[POST /api/bookings/:id/initiate-payment] Booking already paid:',
        bookingId
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Booking already paid',
          code:
            'BOOKING_ALREADY_PAID',
        },
        { status: 400 }
      );
    }

    // ========================================================
    // 7. RESOLVE PAYMENT AMOUNT
    // ========================================================
    //
    // IMPORTANT:
    //
    // This value is in RUPEES.
    //
    // ₹500 here will become 50000 paise inside the
    // Razorpay adapter.
    // ========================================================

    const {
      amount,
      source: amountSource,
    } =
      resolveBookingAmount(
        booking as Record<
          string,
          any
        >
      );

    console.log(
      '[POST /api/bookings/:id/initiate-payment] Payment amount resolved:',
      {
        bookingId,
        amountInRupees:
          amount,
        amountSource,

        bookingAmount:
          booking?.amount ??
          null,

        totalAmount:
          booking?.total_amount ??
          null,

        finalAmount:
          booking?.final_amount ??
          null,

        price:
          booking?.price ??
          null,

        totalPrice:
          booking?.total_price ??
          null,

        fare:
          booking?.fare ??
          null,
      }
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Invalid payment amount:',
        {
          bookingId,
          amount,
          amountSource,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid booking payment amount',
          code:
            'INVALID_BOOKING_AMOUNT',
        },
        { status: 400 }
      );
    }

    // ========================================================
    // 8. FIND EXISTING NON-TERMINAL PAYMENTS
    // ========================================================
    //
    // We NEVER reuse incomplete Razorpay checkout data.
    //
    // Old payment:
    //
    // created / pending / checkout_started
    //
    // without gateway payment ID
    //
    // will be closed and replaced with a fresh payment.
    // ========================================================

    const {
      data: existingPayments,
      error:
      existingPaymentError,
    } = await supabase
      .from('payments')
      .select('*')
      .eq(
        'booking_id',
        bookingId
      )
      .in('status', [
        'created',
        'checkout_started',
        'pending',
      ])
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(10);

    if (
      existingPaymentError
    ) {
      console.warn(
        '[POST /api/bookings/:id/initiate-payment] Existing payment lookup warning:',
        {
          message:
            existingPaymentError.message,
          code:
            existingPaymentError.code,
        }
      );
    }

    const payments: any[] =
      Array.isArray(
        existingPayments
      )
        ? existingPayments
        : [];

    // ========================================================
    // 9. HANDLE EXISTING PAYMENTS
    // ========================================================

    if (
      payments.length > 0
    ) {
      console.log(
        '[POST /api/bookings/:id/initiate-payment] Existing non-terminal payments found:',
        payments.map(
          (
            payment: any
          ) => ({
            id:
              payment?.id,

            status:
              payment?.status,

            amount:
              payment?.amount,

            gateway:
              payment?.gateway,

            selectedGateway:
              payment?.selected_gateway,

            gatewayOrderId:
              payment?.gateway_order_id,

            gatewayPaymentId:
              payment?.gateway_payment_id,

            createdAt:
              payment?.created_at,
          })
        )
      );

      for (
        const existingPayment of payments
      ) {
        // ----------------------------------------------------
        // If a gateway payment ID exists, don't create another
        // payment automatically.
        // ----------------------------------------------------

        if (
          existingPayment?.gateway_payment_id
        ) {
          console.warn(
            '[POST /api/bookings/:id/initiate-payment] Existing gateway payment is already processing:',
            {
              paymentId:
                existingPayment?.id,

              gatewayPaymentId:
                existingPayment?.gateway_payment_id,

              status:
                existingPayment?.status,
            }
          );

          return NextResponse.json(
            {
              success: false,

              error:
                'A payment is already being processed for this booking. Please wait a moment and try again.',

              code:
                'PAYMENT_ALREADY_PROCESSING',

              payment_id:
                existingPayment?.id,
            },
            { status: 409 }
          );
        }

        // ----------------------------------------------------
        // Old payment has no gateway payment ID.
        //
        // It is incomplete/stale and can be superseded.
        // ----------------------------------------------------

        console.warn(
          '[POST /api/bookings/:id/initiate-payment] Closing stale payment:',
          {
            paymentId:
              existingPayment?.id,

            status:
              existingPayment?.status,

            gatewayOrderId:
              existingPayment?.gateway_order_id,
          }
        );

        const {
          error:
          stalePaymentError,
        } = await supabase
          .from('payments')
          .update({
            status:
              'failed',

            failure_reason:
              'Previous incomplete checkout attempt superseded by a fresh checkout attempt.',
          })
          .eq(
            'id',
            existingPayment?.id
          )
          .in('status', [
            'created',
            'checkout_started',
            'pending',
          ]);

        if (
          stalePaymentError
        ) {
          console.error(
            '[POST /api/bookings/:id/initiate-payment] Failed to close stale payment:',
            {
              paymentId:
                existingPayment?.id,

              error:
                stalePaymentError.message,

              code:
                stalePaymentError.code,
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
      }

      console.log(
        '[POST /api/bookings/:id/initiate-payment] Stale payment attempts cleared.'
      );
    }

    // ========================================================
    // 10. CUSTOMER PROFILE
    // ========================================================

    const {
      data: profile,
      error:
      profileError,
    } = await supabase
      .from('profiles')
      .select(
        'full_name, phone, email'
      )
      .eq(
        'id',
        user.id
      )
      .maybeSingle();

    if (
      profileError &&
      profileError.code !==
      'PGRST116'
    ) {
      console.warn(
        '[POST /api/bookings/:id/initiate-payment] Profile lookup warning:',
        profileError.message
      );
    }

    const customerName =
      booking?.customer_name ||
      profile?.full_name ||
      user?.user_metadata
        ?.full_name ||
      'Customer';

    const customerPhone =
      booking?.customer_phone ||
      profile?.phone ||
      user?.phone ||
      '';

    const customerEmail =
      booking?.customer_email ||
      profile?.email ||
      user?.email ||
      '';

    // ========================================================
    // 11. CREATE FRESH PAYMENT
    // ========================================================

    console.log(
      '[POST /api/bookings/:id/initiate-payment] Creating fresh payment:',
      {
        bookingId,

        userId:
          user.id,

        amountInRupees:
          amount,

        expectedRazorpayAmountInPaise:
          Math.round(
            amount * 100
          ),

        currency:
          'INR',

        paymentMethod:
          payment_method,

        amountSource,
      }
    );

    const result =
      await PaymentService.createPayment(
        {
          user_id:
            user.id,

          amount,

          currency:
            'INR',

          payment_method,

          customer_name:
            customerName,

          customer_email:
            customerEmail,

          customer_phone:
            customerPhone,

          booking_id:
            bookingId,

          metadata: {
            service_type:
              booking?.service_type ||
              booking?.transport_service ||
              'Transport',

            provider_name:
              booking?.provider_name ||
              'FaabCab',

            amount_source:
              amountSource,

            faabcab_payment_amount:
              amount,

            checkout_retry:
              payments.length >
              0,
          },
        }
      );

    // ========================================================
    // 12. PAYMENT SERVICE FAILURE
    // ========================================================

    if (
      !result.success
    ) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] PaymentService failed:',
        {
          bookingId,

          amountInRupees:
            amount,

          error:
            result.error,
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

    // ========================================================
    // 13. CHECKOUT DATA
    // ========================================================
    //
    // IMPORTANT:
    //
    // Razorpay returns:
    //
    // order.amount = PAISA
    //
    // So for ₹500:
    //
    // checkoutData.amount = 50000
    //
    // DO NOT divide it by 100 before sending it to
    // Razorpay Checkout.
    // ========================================================

    const checkoutData =
      result.checkout_data as
      | Record<string, any>
      | null
      | undefined;

    const checkoutKey =
      typeof checkoutData?.key ===
        'string'
        ? checkoutData.key.trim()
        : '';

    const checkoutOrderId =
      typeof checkoutData?.order_id ===
        'string'
        ? checkoutData.order_id.trim()
        : '';

    /**
     * Razorpay amount is in PAISE.
     */
    const checkoutAmountPaise =
      Number(
        checkoutData?.amount
      );

    const checkoutCurrency =
      typeof checkoutData?.currency ===
        'string' &&
        checkoutData.currency.trim()
        ? checkoutData.currency.trim()
        : 'INR';

    console.log(
      '[POST /api/bookings/:id/initiate-payment] Checkout data received:',
      {
        paymentId:
          result.payment_id,

        hasKey:
          Boolean(
            checkoutKey
          ),

        hasOrderId:
          Boolean(
            checkoutOrderId
          ),

        checkoutAmountPaise,

        checkoutAmountRupees:
          Number.isFinite(
            checkoutAmountPaise
          )
            ? checkoutAmountPaise /
            100
            : null,

        expectedAmountPaise:
          Math.round(
            amount * 100
          ),

        checkoutCurrency,
      }
    );

    // ========================================================
    // 14. STRICT CHECKOUT DATA VALIDATION
    // ========================================================

    if (
      !checkoutData ||
      !checkoutKey ||
      !checkoutOrderId ||
      !Number.isFinite(
        checkoutAmountPaise
      ) ||
      checkoutAmountPaise <= 0
    ) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] INCOMPLETE CHECKOUT DATA:',
        {
          paymentId:
            result.payment_id,

          checkoutKeys:
            checkoutData
              ? Object.keys(
                checkoutData
              )
              : [],

          hasKey:
            Boolean(
              checkoutKey
            ),

          hasOrderId:
            Boolean(
              checkoutOrderId
            ),

          checkoutAmountPaise,

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

    // ========================================================
    // 15. VERIFY AMOUNT CONSISTENCY
    // ========================================================
    //
    // BOTH SIDES ARE NOW IN PAISE:
    //
    // expected:
    // ₹500 × 100 = 50000 paise
    //
    // Razorpay:
    // order.amount = 50000 paise
    //
    // Therefore:
    //
    // 50000 === 50000
    // ========================================================

    const expectedAmountPaise =
      Math.round(
        amount * 100
      );

    if (
      checkoutAmountPaise !==
      expectedAmountPaise
    ) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Gateway amount mismatch:',
        {
          paymentId:
            result.payment_id,

          expectedAmountRupees:
            amount,

          expectedAmountPaise,

          checkoutAmountPaise,

          checkoutAmountRupees:
            checkoutAmountPaise /
            100,

          orderId:
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

    // ========================================================
    // 16. SAVE PAYMENT ID TO BOOKING
    // ========================================================

    const {
      error:
      bookingUpdateError,
    } = await supabase
      .from('bookings')
      .update({
        payment_id:
          result.payment_id,
      })
      .eq(
        'id',
        bookingId
      );

    if (
      bookingUpdateError
    ) {
      console.error(
        '[POST /api/bookings/:id/initiate-payment] Failed to update booking payment_id:',
        {
          bookingId,

          paymentId:
            result.payment_id,

          error:
            bookingUpdateError.message,

          code:
            bookingUpdateError.code,
        }
      );

      /**
       * Do not block checkout.
       *
       * The payment itself was created successfully and the
       * gateway checkout data is valid.
       */
    }

    // ========================================================
    // 17. FINAL CHECKOUT RESPONSE
    // ========================================================
    //
    // IMPORTANT:
    //
    // checkout_data.amount remains in PAISE.
    //
    // For ₹500:
    //
    // amount = 50000
    //
    // This is exactly what Razorpay Checkout expects.
    // ========================================================

    const finalCheckoutData = {
      ...checkoutData,

      key:
        checkoutKey,

      order_id:
        checkoutOrderId,

      amount:
        checkoutAmountPaise,

      currency:
        checkoutCurrency,
    };

    console.log(
      '[POST /api/bookings/:id/initiate-payment] PAYMENT CHECKOUT READY:',
      {
        bookingId,

        paymentId:
          result.payment_id,

        orderId:
          checkoutOrderId,

        amountInRupees:
          amount,

        amountInPaise:
          checkoutAmountPaise,

        currency:
          checkoutCurrency,
      }
    );

    return NextResponse.json({
      success: true,

      payment_id:
        result.payment_id,

      checkout_data:
        finalCheckoutData,

      /**
       * Top-level amount is kept in RUPEES for application
       * level display/logic.
       */
      amount,

      currency:
        checkoutCurrency,
    });
  } catch (error: any) {
    console.error(
      '[POST /api/bookings/:id/initiate-payment] Unexpected error:',
      {
        bookingId,

        userId:
          user?.id,

        message:
          error?.message,

        stack:
          error?.stack,
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