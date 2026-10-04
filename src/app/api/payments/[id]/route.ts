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

    const { id: paymentId } = await params;

    // Get payment with attempts
    const payment = await PaymentService.getPayment(paymentId);
    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    // Verify user owns this payment
    if (payment.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    // Get payment attempts
    const attempts = await PaymentService.getPaymentAttempts(paymentId);

    return NextResponse.json({
      success: true,
      payment,
      attempts,
    });
  } catch (error: any) {
    console.error('[GET /api/payments/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get payment' },
      { status: 500 }
    );
  }
}
