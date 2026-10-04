import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';
import { createAdminClient } from '@/lib/supabase';
import { PaymentService } from '@/lib/payment/service';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // TODO: Add admin role check

    const { id: paymentId } = await params;

    const payment = await PaymentService.getPayment(paymentId);
    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    const attempts = await PaymentService.getPaymentAttempts(paymentId);

    const supabase = createAdminClient();
    const { data: refunds } = await supabase
      .from('payment_refunds')
      .select('*')
      .eq('payment_id', paymentId)
      .order('created_at', { ascending: false });

    const { data: routingLogs } = await supabase
      .from('payment_routing_logs')
      .select('*, gateway:payment_gateways(*)')
      .eq('payment_id', paymentId)
      .order('attempt_number', { ascending: true });

    return NextResponse.json({
      success: true,
      payment,
      attempts,
      refunds,
      routingLogs,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/payments/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get payment details' },
      { status: 500 }
    );
  }
}
