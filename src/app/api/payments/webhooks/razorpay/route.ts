import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { createGatewayAdapter } from '@/lib/payment/adapters';
import { PaymentService } from '@/lib/payment/service';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // ============================================================
    // 1. READ RAW BODY
    // IMPORTANT: Signature must be calculated from the raw body.
    // ============================================================
    const body = await request.text();

    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('[Razorpay Webhook] Missing signature');

      return NextResponse.json(
        {
          success: false,
          error: 'Missing signature',
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 2. GET WEBHOOK SECRET
    // ============================================================
    const env = process.env.PAYMENT_ENV || 'sandbox';

    const secret =
      env === 'production'
        ? process.env.RAZORPAY_WEBHOOK_SECRET || ''
        : process.env.RAZORPAY_WEBHOOK_SECRET_SANDBOX || '';

    if (!secret) {
      console.error(
        '[Razorpay Webhook] Webhook secret not configured'
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Webhook secret not configured',
        },
        { status: 500 }
      );
    }

    // ============================================================
    // 3. VERIFY RAZORPAY SIGNATURE
    // ============================================================
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const signaturesMatch =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      );

    if (!signaturesMatch) {
      console.error('[Razorpay Webhook] Invalid signature');

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid signature',
        },
        { status: 401 }
      );
    }

    // ============================================================
    // 4. PARSE PAYLOAD
    // ============================================================
    let payload: any;

    try {
      payload = JSON.parse(body);
    } catch {
      console.error('[Razorpay Webhook] Invalid JSON payload');

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON payload',
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 5. GET EVENT ID FROM RAZORPAY HEADER
    //
    // Razorpay sends:
    // x-razorpay-event-id
    //
    // Do NOT use payload.id / payload.event_id here.
    // ============================================================
    const eventId = request.headers.get('x-razorpay-event-id');

    if (!eventId) {
      console.error('[Razorpay Webhook] Missing event ID');

      return NextResponse.json(
        {
          success: false,
          error: 'Missing event ID',
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 6. EVENT TYPE
    // Example:
    // payment.captured
    // payment.failed
    // order.paid
    // ============================================================
    const eventType = payload?.event;

    if (!eventType) {
      console.error('[Razorpay Webhook] Missing event type');

      return NextResponse.json(
        {
          success: false,
          error: 'Missing event type',
        },
        { status: 400 }
      );
    }

    console.log('[Razorpay Webhook] Received:', {
      eventId,
      eventType,
    });

    // ============================================================
    // 7. CREATE ADMIN SUPABASE CLIENT
    // ============================================================
    const supabase = createAdminClient();

    // ============================================================
    // 8. DUPLICATE WEBHOOK CHECK
    // ============================================================
    const { data: existingEvent, error: existingEventError } =
      await supabase
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
          error: 'Failed to check webhook event',
        },
        { status: 500 }
      );
    }

    if (existingEvent) {
      console.log(
        '[Razorpay Webhook] Duplicate event, skipping:',
        eventId
      );

      return NextResponse.json({
        success: true,
        message: 'Event already processed',
      });
    }

    // ============================================================
    // 9. CREATE PAYLOAD HASH
    // ============================================================
    const payloadHash = crypto
      .createHash('sha256')
      .update(body)
      .digest('hex');

    // ============================================================
    // 10. STORE WEBHOOK EVENT
    // ============================================================
    const { error: insertEventError } = await supabase
      .from('payment_webhook_events')
      .insert({
        gateway: 'razorpay',
        event_id: eventId,
        event_type: eventType,
        payload_hash: payloadHash,
        processing_status: 'processing',
      });

    if (insertEventError) {
      // If another request inserted the same event simultaneously,
      // treat it as already processed.
      if (
        insertEventError.code === '23505' ||
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
          message: 'Event already processed',
        });
      }

      console.error(
        '[Razorpay Webhook] Failed to store webhook event:',
        insertEventError
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to store webhook event',
        },
        { status: 500 }
      );
    }

    // ============================================================
    // 11. HANDLE WEBHOOK THROUGH RAZORPAY ADAPTER
    // ============================================================
    const adapter = createGatewayAdapter('razorpay');

    const result = await adapter.handleWebhook({
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
          error: result.error || 'Webhook processing failed',
        },
        { status: 500 }
      );
    }

    // ============================================================
    // 12. EXTRACT RAZORPAY PAYMENT / ORDER DATA
    // ============================================================
    const razorpayPayment =
      payload?.payload?.payment?.entity || null;

    const razorpayOrderId =
      razorpayPayment?.order_id ||
      payload?.payload?.order?.entity?.id ||
      null;

    const razorpayPaymentId =
      razorpayPayment?.id || null;

    // ============================================================
    // 13. FIND OUR INTERNAL PAYMENT RECORD
    //
    // Primary lookup:
    // our payments.gateway_order_id == Razorpay order_id
    //
    // Fallback:
    // result.payment_id if adapter returns our internal ID.
    // ============================================================
    let payment: any = null;

    if (razorpayOrderId) {
      const { data: paymentByOrder, error: paymentLookupError } =
        await supabase
          .from('payments')
          .select('*')
          .eq('gateway_order_id', razorpayOrderId)
          .maybeSingle();

      if (paymentLookupError) {
        console.error(
          '[Razorpay Webhook] Payment lookup by order ID failed:',
          paymentLookupError
        );
      } else {
        payment = paymentByOrder;
      }
    }

    // Fallback: adapter may return our internal payment ID
    if (!payment && result.payment_id) {
      const { data: paymentById, error: paymentByIdError } =
        await supabase
          .from('payments')
          .select('*')
          .eq('id', result.payment_id)
          .maybeSingle();

      if (paymentByIdError) {
        console.error(
          '[Razorpay Webhook] Payment lookup by internal ID failed:',
          paymentByIdError
        );
      } else {
        payment = paymentById;
      }
    }

    // ============================================================
    // 14. PROCESS PAYMENT STATUS
    // ============================================================
    if (payment && result.status) {
      console.log('[Razorpay Webhook] Processing payment:', {
        internalPaymentId: payment.id,
        razorpayOrderId,
        razorpayPaymentId,
        status: result.status,
      });

      if (
        result.status === 'success' &&
        razorpayPaymentId
      ) {
        await PaymentService.processSuccessfulPayment(
          payment.id,
          razorpayPaymentId,
          'razorpay'
        );
      } else if (result.status === 'failed') {
        const failureReason =
          razorpayPayment?.error_description ||
          razorpayPayment?.error_reason ||
          razorpayPayment?.error_code ||
          'Payment failed';

        await PaymentService.processFailedPayment(
          payment.id,
          failureReason
        );
      }
    } else if (!payment) {
      console.warn(
        '[Razorpay Webhook] No matching payment record found:',
        {
          eventId,
          eventType,
          razorpayOrderId,
          razorpayPaymentId,
          adapterPaymentId: result.payment_id,
        }
      );
    }

    // ============================================================
    // 15. MARK WEBHOOK COMPLETED
    // ============================================================
    const { error: completeEventError } = await supabase
      .from('payment_webhook_events')
      .update({
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('gateway', 'razorpay')
      .eq('event_id', eventId);

    if (completeEventError) {
      console.error(
        '[Razorpay Webhook] Failed to mark event completed:',
        completeEventError
      );
    }

    // ============================================================
    // 16. SUCCESS RESPONSE
    // ============================================================
    console.log(
      '[Razorpay Webhook] Successfully processed:',
      {
        eventId,
        eventType,
      }
    );

    return NextResponse.json({
      success: true,
      event_id: eventId,
      event_type: eventType,
    });
  } catch (error: any) {
    console.error('[Razorpay Webhook] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Webhook processing failed',
      },
      { status: 500 }
    );
  }
}