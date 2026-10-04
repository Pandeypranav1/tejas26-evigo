import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';
import { createAdminClient } from '@/lib/supabase';
import { createGatewayAdapter } from '@/lib/payment/adapters';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { payment_id, amount, reason } = body;

    if (!payment_id || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: payment_id, amount' },
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
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    // Verify payment is successful
    if (payment.status !== 'success') {
      return NextResponse.json(
        { success: false, error: 'Only successful payments can be refunded' },
        { status: 400 }
      );
    }

    // Verify user owns this payment (or is admin)
    // For now, we'll allow any authenticated user to refund - add admin check later
    if (payment.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    // Check if refund amount doesn't exceed payment amount
    const refundAmount = Number(amount);
    if (refundAmount > Number(payment.amount)) {
      return NextResponse.json(
        { success: false, error: 'Refund amount cannot exceed payment amount' },
        { status: 400 }
      );
    }

    if (!payment.gateway_payment_id || !payment.selected_gateway) {
      return NextResponse.json(
        { success: false, error: 'Payment gateway information missing' },
        { status: 400 }
      );
    }

    // Create refund record
    const { data: refund } = await supabase
      .from('payment_refunds')
      .insert({
        payment_id: payment.id,
        gateway: payment.selected_gateway,
        amount: refundAmount,
        status: 'pending',
        reason: reason || 'Refund requested',
      })
      .select()
      .single();

    // Initiate refund with gateway
    const adapter = createGatewayAdapter(payment.selected_gateway as any);
    const refundResult = await adapter.refundPayment({
      gateway_payment_id: payment.gateway_payment_id,
      amount: refundAmount,
      reason: reason || 'Refund requested',
    });

    if (!refundResult.success) {
      await supabase
        .from('payment_refunds')
        .update({ status: 'failed' })
        .eq('id', refund.id);

      return NextResponse.json(
        { success: false, error: refundResult.error || 'Refund failed' },
        { status: 500 }
      );
    }

    // Update refund record
    await supabase
      .from('payment_refunds')
      .update({
        gateway_refund_id: refundResult.gateway_refund_id,
        status: 'success',
        completed_at: new Date().toISOString(),
      })
      .eq('id', refund.id);

    // Update payment status
    const totalRefunded = await getTotalRefundedAmount(supabase, payment.id);
    if (totalRefunded >= Number(payment.amount)) {
      await supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('id', payment.id);
    } else {
      await supabase
        .from('payments')
        .update({ status: 'partially_refunded' })
        .eq('id', payment.id);
    }

    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      gateway_refund_id: refundResult.gateway_refund_id,
    });
  } catch (error: any) {
    console.error('[POST /api/payments/refund] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Refund failed' },
      { status: 500 }
    );
  }
}

async function getTotalRefundedAmount(supabase: any, paymentId: string): Promise<number> {
  const { data: refunds } = await supabase
    .from('payment_refunds')
    .select('amount')
    .eq('payment_id', paymentId)
    .eq('status', 'success');

  if (!refunds || refunds.length === 0) return 0;
  return refunds.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
}
