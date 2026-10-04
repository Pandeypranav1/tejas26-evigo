import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';
import { createAdminClient } from '@/lib/supabase';
import { PaymentService } from '@/lib/payment/service';
import { PaymentMethod } from '@/lib/payment/types';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: comboBookingId } = await params;
  let user: any = null;

  try {
    const authResult = await getAuthenticatedUser();
    user = authResult.user;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const body = await request.json();
    const { payment_method = 'upi' } = body;

    const supabase = createAdminClient();

    // Get combo booking details
    const { data: comboBooking, error: bookingError } = await supabase
      .from('combo_bookings')
      .select('*')
      .eq('id', comboBookingId)
      .single();

    if (bookingError || !comboBooking) {
      return NextResponse.json({ success: false, error: 'Combo booking not found' }, { status: 404 });
    }

    // Verify user owns this booking
    if (comboBooking.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    // Check if booking already has a successful payment
    if (comboBooking.payment_status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Combo booking already paid' },
        { status: 400 }
      );
    }

    // Check for existing non-terminal payment (idempotency)
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('combo_booking_id', comboBookingId)
      .in('status', ['created', 'checkout_started', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPayment) {
      console.log('[POST /api/combo-packs/:id/initiate-payment] Returning existing payment:', existingPayment.id);
      // Return existing payment to prevent duplicate creation
      return NextResponse.json({
        success: true,
        payment_id: existingPayment.id,
        checkout_data: existingPayment.gateway_order_id ? { order_id: existingPayment.gateway_order_id } : null,
        amount: Number(existingPayment.amount),
        is_existing: true,
      });
    }

    // Use the server-side calculated total_amount from combo_booking
    const amount = Number(comboBooking.total_amount);

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid booking amount' },
        { status: 400 }
      );
    }

    const customerName = comboBooking.customer_name || user.user_metadata?.full_name || 'Customer';
    const customerPhone = comboBooking.customer_phone || user.phone || '';
    const customerEmail = comboBooking.customer_email || user.email || '';

    // Create payment
    const result = await PaymentService.createPayment({
      user_id: user.id,
      amount,
      currency: 'INR',
      payment_method: payment_method as PaymentMethod,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      combo_booking_id: comboBookingId,
      metadata: {
        combo_name: comboBooking.combo_name,
        guest_count: comboBooking.guest_count,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Update combo booking with payment reference
    await supabase
      .from('combo_bookings')
      .update({ payment_id: result.payment_id })
      .eq('id', comboBookingId);

    return NextResponse.json({
      success: true,
      payment_id: result.payment_id,
      checkout_data: result.checkout_data,
      amount,
    });
  } catch (error: any) {
    console.error('[POST /api/combo-packs/:id/initiate-payment] Error:', {
      comboBookingId,
      userId: user?.id,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { success: false, error: 'Payment service temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}
