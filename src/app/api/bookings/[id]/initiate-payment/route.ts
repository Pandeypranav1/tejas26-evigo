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
  const { id: bookingId } = await params;
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

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Verify user owns this booking
    if (booking.client_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    // Check if booking already has a successful payment
    if (booking.payment_status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Booking already paid' },
        { status: 400 }
      );
    }

    // Check for existing non-terminal payment (idempotency)
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .in('status', ['created', 'checkout_started', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPayment) {
      console.log('[POST /api/bookings/:id/initiate-payment] Returning existing payment:', existingPayment.id);
      // Return existing payment to prevent duplicate creation
      return NextResponse.json({
        success: true,
        payment_id: existingPayment.id,
        checkout_data: existingPayment.gateway_order_id ? { order_id: existingPayment.gateway_order_id } : null,
        amount: Number(existingPayment.amount),
        is_existing: true,
      });
    }

    // Calculate booking amount (server-side authoritative calculation)
    let amount = 0;
    if (booking.service_type === 'Transport' || booking.transport_service) {
      // For transport, use a base rate or fetch from pricing table
      // For now, use a default rate - this should be enhanced with actual pricing logic
      amount = 500; // Base rate in INR
    } else {
      // For other services, use a default rate
      amount = 1000;
    }

    // Get user profile for payment details
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', user.id)
      .single();

    const customerName = booking.customer_name || profile?.full_name || user.user_metadata?.full_name || 'Customer';
    const customerPhone = booking.customer_phone || profile?.phone || user.phone || '';
    const customerEmail = booking.customer_email || profile?.email || user.email || '';

    // Create payment
    const result = await PaymentService.createPayment({
      user_id: user.id,
      amount,
      currency: 'INR',
      payment_method: payment_method as PaymentMethod,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      booking_id: bookingId,
      metadata: {
        service_type: booking.service_type || booking.transport_service,
        provider_name: booking.provider_name,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Update booking with payment reference
    await supabase
      .from('bookings')
      .update({ payment_id: result.payment_id })
      .eq('id', bookingId);

    return NextResponse.json({
      success: true,
      payment_id: result.payment_id,
      checkout_data: result.checkout_data,
      amount,
    });
  } catch (error: any) {
    console.error('[POST /api/bookings/:id/initiate-payment] Error:', {
      bookingId,
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
