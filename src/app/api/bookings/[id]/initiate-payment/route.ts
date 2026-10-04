import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';
import { createAdminClient } from '@/lib/supabase';
import { PaymentService } from '@/lib/payment/service';
import { PaymentMethod } from '@/lib/payment/types';

const VALID_PAYMENT_METHODS = new Set<PaymentMethod>(['upi', 'card', 'netbanking', 'wallet', 'emi']);

function getValidatedPaymentMethod(value: unknown): PaymentMethod | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return VALID_PAYMENT_METHODS.has(normalized as PaymentMethod) ? (normalized as PaymentMethod) : null;
}

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

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const payment_method = getValidatedPaymentMethod(body?.payment_method ?? 'upi');
    if (!payment_method) {
      return NextResponse.json({ success: false, error: 'Unsupported payment method' }, { status: 400 });
    }

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

    const bookingAmount = Number(booking.amount ?? booking.total_amount ?? booking.final_amount ?? booking.price ?? 0);
    const defaultAmount = booking.service_type === 'Transport' || booking.transport_service ? 500 : 1000;
    const amount = Number.isFinite(bookingAmount) && bookingAmount > 0 ? bookingAmount : defaultAmount;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid booking amount' }, { status: 400 });
    }

    // Get user profile for payment details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('[POST /api/bookings/:id/initiate-payment] Profile query error:', profileError.message);
    }

    const customerName = booking.customer_name || profile?.full_name || user.user_metadata?.full_name || 'Customer';
    const customerPhone = booking.customer_phone || profile?.phone || user.phone || '';
    const customerEmail = booking.customer_email || profile?.email || user.email || '';

    // Create payment
    const result = await PaymentService.createPayment({
      user_id: user.id,
      amount,
      currency: 'INR',
      payment_method,
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
