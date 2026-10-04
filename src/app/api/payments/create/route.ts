import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';
import { PaymentService } from '@/lib/payment/service';
import { PaymentMethod } from '@/lib/payment/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      amount,
      currency = 'INR',
      payment_method = 'upi',
      customer_name,
      customer_email,
      customer_phone,
      booking_id,
      combo_booking_id,
      metadata,
    } = body;

    // Validate required fields
    if (!amount || !customer_name || !customer_phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: amount, customer_name, customer_phone' },
        { status: 400 }
      );
    }

    // Validate payment method
    const validMethods: PaymentMethod[] = ['upi', 'card', 'netbanking', 'wallet', 'emi'];
    if (!validMethods.includes(payment_method)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Validate that either booking_id or combo_booking_id is provided
    if (!booking_id && !combo_booking_id) {
      return NextResponse.json(
        { success: false, error: 'Either booking_id or combo_booking_id is required' },
        { status: 400 }
      );
    }

    // Create payment
    const result = await PaymentService.createPayment({
      user_id: user.id,
      amount: Number(amount),
      currency,
      payment_method,
      customer_name,
      customer_email,
      customer_phone,
      booking_id,
      combo_booking_id,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        payment_id: result.payment_id,
        checkout_data: result.checkout_data,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/payments/create] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Payment creation failed' },
      { status: 500 }
    );
  }
}
