import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { createGatewayAdapter } from '@/lib/payment/adapters';
import { PaymentService } from '@/lib/payment/service';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-cf-signature');

    if (!signature) {
      console.error('[Cashfree Webhook] Missing signature');
      return NextResponse.json({ success: false, error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const env = process.env.PAYMENT_ENV || 'sandbox';
    const secret = env === 'production'
      ? (process.env.CASHFREE_WEBHOOK_SECRET || '')
      : (process.env.CASHFREE_WEBHOOK_SECRET_SANDBOX || '');

    if (!secret) {
      console.error('[Cashfree Webhook] Webhook secret not configured');
      return NextResponse.json({ success: false, error: 'Webhook secret not configured' }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('[Cashfree Webhook] Invalid signature');
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const eventId = payload.id || payload.data?.order_id;
    const eventType = payload.event_type || payload.data?.payment?.payment_status;

    if (!eventId) {
      console.error('[Cashfree Webhook] Missing event ID');
      return NextResponse.json({ success: false, error: 'Missing event ID' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check for duplicate webhook processing
    const { data: existingEvent } = await supabase
      .from('payment_webhook_events')
      .select('*')
      .eq('gateway', 'cashfree')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingEvent) {
      console.log('[Cashfree Webhook] Duplicate event, skipping');
      return NextResponse.json({ success: true, message: 'Event already processed' });
    }

    // Log webhook event
    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
    await supabase.from('payment_webhook_events').insert({
      gateway: 'cashfree',
      event_id: eventId,
      event_type: eventType,
      payload_hash: payloadHash,
      processing_status: 'processing',
    });

    // Process webhook
    const adapter = createGatewayAdapter('cashfree');
    const result = await adapter.handleWebhook({
      gateway: 'cashfree',
      event_id: eventId,
      event_type: eventType,
      payload,
      signature,
    });

    if (!result.success) {
      await supabase
        .from('payment_webhook_events')
        .update({ processing_status: 'failed' })
        .eq('gateway', 'cashfree')
        .eq('event_id', eventId);

      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    // Update payment status if payment_id is returned
    if (result.payment_id && result.status) {
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('gateway_order_id', result.payment_id)
        .maybeSingle();

      if (payment) {
        const gatewayPaymentId = payload.data?.payment?.cf_payment_id;
        if (result.status === 'success' && gatewayPaymentId) {
          await PaymentService.processSuccessfulPayment(
            payment.id,
            gatewayPaymentId,
            'cashfree'
          );
        } else if (result.status === 'failed') {
          await PaymentService.processFailedPayment(
            payment.id,
            payload.data?.payment?.payment_message || 'Payment failed'
          );
        }
      }
    }

    // Mark webhook as processed
    await supabase
      .from('payment_webhook_events')
      .update({ processing_status: 'completed', processed_at: new Date().toISOString() })
      .eq('gateway', 'cashfree')
      .eq('event_id', eventId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Cashfree Webhook] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
