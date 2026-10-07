import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase';

import { createGatewayAdapter } from '@/lib/payment/adapters';

import { PaymentService } from '@/lib/payment/service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // ============================================================
    // 1. READ REQUEST BODY
    // ============================================================

    let body: any;

    try {
      body = await request.json();
    } catch (error) {
      console.error('[Payment Verify] Invalid JSON body:', error);

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
        },
        { status: 400 }
      );
    }

    const paymentId =
      typeof body?.payment_id === 'string'
        ? body.payment_id.trim()
        : '';

    const gatewayPaymentId =
      typeof body?.gateway_payment_id === 'string'
        ? body.gateway_payment_id.trim()
        : '';

    const gatewayOrderId =
      typeof body?.gateway_order_id === 'string'
        ? body.gateway_order_id.trim()
        : '';

    const signature =
      typeof body?.signature === 'string'
        ? body.signature.trim()
        : '';

    console.log('[Payment Verify] Request received:', {
      paymentId: paymentId || null,
      gatewayPaymentId: gatewayPaymentId || null,
      gatewayOrderId: gatewayOrderId || null,
      hasSignature: Boolean(signature),
    });

    // ============================================================
    // 2. VALIDATE REQUIRED FIELDS
    // ============================================================

    if (!paymentId) {
      console.error('[Payment Verify] Missing payment_id');

      return NextResponse.json(
        {
          success: false,
          error: 'Missing payment_id',
        },
        { status: 400 }
      );
    }

    if (!gatewayPaymentId) {
      console.error('[Payment Verify] Missing gateway_payment_id');

      return NextResponse.json(
        {
          success: false,
          error: 'Missing gateway_payment_id',
        },
        { status: 400 }
      );
    }

    if (!gatewayOrderId) {
      console.error('[Payment Verify] Missing gateway_order_id');

      return NextResponse.json(
        {
          success: false,
          error: 'Missing gateway_order_id',
        },
        { status: 400 }
      );
    }

    if (!signature) {
      console.error('[Payment Verify] Missing Razorpay signature');

      return NextResponse.json(
        {
          success: false,
          error: 'Missing Razorpay payment signature',
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 3. LOAD INTERNAL PAYMENT
    // ============================================================

    const supabase = createAdminClient();

    const {
      data: payment,
      error: paymentLookupError,
    } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (paymentLookupError) {
      console.error(
        '[Payment Verify] Failed to load payment:',
        {
          code: paymentLookupError.code,
          message: paymentLookupError.message,
          details: paymentLookupError.details,
          hint: paymentLookupError.hint,
          paymentId,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Unable to load payment record',
          details: paymentLookupError.message,
        },
        { status: 500 }
      );
    }

    if (!payment) {
      console.error(
        '[Payment Verify] Internal payment not found:',
        paymentId
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Payment record not found',
        },
        { status: 404 }
      );
    }

    console.log('[Payment Verify] Internal payment found:', {
      paymentId: payment.id,
      status: payment.status,
      gateway: payment.gateway,
      selectedGateway: payment.selected_gateway,
      storedGatewayOrderId: payment.gateway_order_id || null,
      storedGatewayPaymentId:
        payment.gateway_payment_id || null,
    });

    // ============================================================
    // 4. IDEMPOTENCY
    //
    // Webhook can reach us before the browser calls /verify.
    // If webhook already marked the payment successful,
    // don't return an error.
    // ============================================================

    if (
      payment.status === 'success' ||
      payment.status === 'captured'
    ) {
      console.log(
        '[Payment Verify] Payment already processed successfully:',
        {
          paymentId: payment.id,
          status: payment.status,
        }
      );

      return NextResponse.json({
        success: true,
        already_processed: true,
        payment_id: payment.id,
        message: 'Payment already verified successfully',
      });
    }

    // ============================================================
    // 5. VERIFY ORDER ID
    // ============================================================

    if (
      payment.gateway_order_id &&
      payment.gateway_order_id !== gatewayOrderId
    ) {
      console.error(
        '[Payment Verify] Razorpay order mismatch:',
        {
          paymentId: payment.id,
          storedOrderId: payment.gateway_order_id,
          receivedOrderId: gatewayOrderId,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Razorpay order ID mismatch',
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 6. ENSURE RAZORPAY GATEWAY
    // ============================================================

    const gatewayCode =
      payment.gateway ||
      payment.selected_gateway ||
      'razorpay';

    if (gatewayCode !== 'razorpay') {
      console.error(
        '[Payment Verify] Unsupported gateway:',
        {
          paymentId: payment.id,
          gatewayCode,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: `Unsupported payment gateway: ${gatewayCode}`,
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 7. VERIFY PAYMENT WITH RAZORPAY
    // ============================================================

    const adapter = createGatewayAdapter('razorpay');

    console.log('[Payment Verify] Verifying with Razorpay:', {
      paymentId: payment.id,
      gatewayPaymentId,
      gatewayOrderId,
    });

    const verificationResult =
      await adapter.verifyPayment({
        gateway_payment_id: gatewayPaymentId,
        gateway_order_id: gatewayOrderId,
        signature,
      });

    console.log('[Payment Verify] Razorpay verification result:', {
      success: verificationResult.success,
      status: verificationResult.status,
      gatewayPaymentId:
        verificationResult.gateway_payment_id || null,
      error: verificationResult.error || null,
    });

    // ============================================================
    // 8. RAZORPAY VERIFICATION FAILED
    // ============================================================

    if (!verificationResult.success) {
      console.error(
        '[Payment Verify] Razorpay verification failed:',
        {
          paymentId: payment.id,
          gatewayPaymentId,
          gatewayOrderId,
          error: verificationResult.error,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            verificationResult.error ||
            'Razorpay payment verification failed',
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 9. PAYMENT NOT YET CAPTURED
    // ============================================================

    if (verificationResult.status !== 'success') {
      console.warn(
        '[Payment Verify] Payment is not captured yet:',
        {
          paymentId: payment.id,
          status: verificationResult.status,
        }
      );

      return NextResponse.json(
        {
          success: false,
          pending: true,
          error:
            verificationResult.status === 'pending'
              ? 'Payment is still being processed'
              : `Payment status: ${verificationResult.status}`,
        },
        { status: 409 }
      );
    }

    // ============================================================
    // 10. MARK INTERNAL PAYMENT SUCCESSFUL
    // ============================================================

    console.log(
      '[Payment Verify] Razorpay payment captured. Updating internal payment:',
      {
        paymentId: payment.id,
        gatewayPaymentId,
      }
    );

    try {
      await PaymentService.processSuccessfulPayment(
        payment.id,
        verificationResult.gateway_payment_id ||
        gatewayPaymentId,
        'razorpay'
      );
    } catch (processingError: any) {
      console.error(
        '[Payment Verify] Failed to process successful payment:',
        {
          paymentId: payment.id,
          error:
            processingError?.message ||
            processingError,
          stack: processingError?.stack,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Payment was verified by Razorpay but internal payment processing failed',
          details:
            processingError?.message ||
            'Unknown payment processing error',
        },
        { status: 500 }
      );
    }

    // ============================================================
    // 11. FINAL DATABASE CHECK
    // ============================================================

    const {
      data: updatedPayment,
      error: finalLookupError,
    } = await supabase
      .from('payments')
      .select(
        'id,status,gateway_payment_id,gateway_order_id,paid_at'
      )
      .eq('id', payment.id)
      .maybeSingle();

    if (finalLookupError) {
      console.error(
        '[Payment Verify] Final payment lookup failed:',
        {
          code: finalLookupError.code,
          message: finalLookupError.message,
          details: finalLookupError.details,
          hint: finalLookupError.hint,
        }
      );
    }

    console.log('[Payment Verify] Payment verification completed:', {
      paymentId: payment.id,
      status: updatedPayment?.status || null,
      gatewayPaymentId:
        updatedPayment?.gateway_payment_id || null,
      gatewayOrderId:
        updatedPayment?.gateway_order_id || null,
      paidAt: updatedPayment?.paid_at || null,
    });

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      gateway_payment_id:
        verificationResult.gateway_payment_id ||
        gatewayPaymentId,
      gateway_order_id: gatewayOrderId,
      status: 'success',
      message: 'Payment verified successfully',
    });
  } catch (error: any) {
    console.error(
      '[Payment Verify] Unexpected server error:',
      {
        message: error?.message || error,
        stack: error?.stack,
      }
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          'Unexpected payment verification error',
      },
      { status: 500 }
    );
  }
}