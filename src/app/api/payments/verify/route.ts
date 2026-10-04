import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';
import { createAdminClient } from '@/lib/supabase';
import { createGatewayAdapter } from '@/lib/payment/adapters';
import { PaymentService } from '@/lib/payment/service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Authentication required - prevent unauthorized payment verification
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { payment_id, gateway_payment_id, signature } = body;

    if (!payment_id || !gateway_payment_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: payment_id, gateway_payment_id' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get payment details
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Verify user owns this payment
    if (payment.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to verify this payment' },
        { status: 403 }
      );
    }

    if (!payment.selected_gateway || !payment.gateway_order_id) {
      return NextResponse.json(
        { success: false, error: 'Payment not properly initialized' },
        { status: 400 }
      );
    }

    // Verify payment with gateway
    const adapter = createGatewayAdapter(payment.selected_gateway as any);
    const verifyResult = await adapter.verifyPayment({
      gateway_order_id: payment.gateway_order_id,
      gateway_payment_id,
      signature,
    });

    if (!verifyResult.success) {
      await PaymentService.processFailedPayment(payment_id, verifyResult.error || 'Verification failed');
      return NextResponse.json(
        { success: false, error: verifyResult.error, status: 'failed' },
        { status: 400 }
      );
    }

    // Update payment based on verification result
    if (verifyResult.status === 'success') {
      await PaymentService.processSuccessfulPayment(
        payment_id,
        gateway_payment_id,
        payment.selected_gateway as any
      );
    } else if (verifyResult.status === 'failed') {
      await PaymentService.processFailedPayment(payment_id, 'Payment verification returned failed status');
    }

    return NextResponse.json({
      success: true,
      status: verifyResult.status,
    });
  } catch (error: any) {
    console.error('[POST /api/payments/verify] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
