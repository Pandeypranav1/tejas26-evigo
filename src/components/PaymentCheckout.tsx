'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type PaymentCheckoutProps = {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  comboBookingId?: string;
  bookingName?: string;
  amount?: number;
};

type CheckoutData = {
  payment_id: string;
  checkout_data: any;
  amount: number;
};

type PaymentStatus = 'idle' | 'initiating' | 'processing' | 'success' | 'failed';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function PaymentCheckout({
  isOpen,
  onClose,
  bookingId,
  comboBookingId,
  bookingName,
  amount,
}: PaymentCheckoutProps) {
  const router = useRouter();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);

  useEffect(() => {
    if (isOpen) {
      initiatePayment();
    }
  }, [isOpen]);

  const initiatePayment = async () => {
    if (!bookingId && !comboBookingId) {
      setError('Invalid booking');
      return;
    }

    setStatus('initiating');
    setError(null);

    try {
      const endpoint = bookingId
        ? `/api/bookings/${bookingId}/initiate-payment`
        : `/api/combo-packs/${comboBookingId}/initiate-payment`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: 'upi' }),
      });

      // Handle non-JSON responses (HTML error pages)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[PaymentCheckout] Non-JSON response:', text);
        throw new Error('Server error: Unable to process payment request. Please try again.');
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      setCheckoutData(data);
      setStatus('processing');
      openPaymentGateway(data);
    } catch (err: any) {
      console.error('[PaymentCheckout] Initiate payment error:', err);
      setError(err.message || 'Failed to initiate payment');
      setStatus('failed');
    }
  };

  const openPaymentGateway = (data: CheckoutData) => {
    const { checkout_data, payment_id } = data;

    // Check if it's Razorpay or Cashfree based on checkout_data structure
    if (checkout_data.key) {
      // Razorpay
      openRazorpay(checkout_data, payment_id);
    } else if (checkout_data.order_token) {
      // Cashfree
      openCashfree(checkout_data, payment_id);
    } else {
      setError('Unsupported payment gateway');
      setStatus('failed');
    }
  };

  const openRazorpay = (checkoutData: any, paymentId: string) => {
    if (!window.Razorpay) {
      // Load Razorpay script dynamically
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        if (window.Razorpay) {
          executeRazorpayPayment(window.Razorpay, checkoutData, paymentId);
        }
      };
      script.onerror = () => {
        setError('Failed to load payment gateway');
        setStatus('failed');
      };
      document.body.appendChild(script);
    } else {
      executeRazorpayPayment(window.Razorpay, checkoutData, paymentId);
    }
  };

  const executeRazorpayPayment = (Razorpay: any, checkoutData: any, paymentId: string) => {
    const options = {
      key: checkoutData.key,
      amount: checkoutData.amount,
      currency: checkoutData.currency || 'INR',
      name: 'Evigo',
      description: bookingName || 'Booking Payment',
      order_id: checkoutData.order_id,
      handler: async (response: any) => {
        await verifyPayment(paymentId, response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature);
      },
      prefill: {
        name: checkoutData.prefill?.name,
        email: checkoutData.prefill?.email,
        contact: checkoutData.prefill?.contact,
      },
      theme: {
        color: '#06b6d4',
      },
      modal: {
        ondismiss: () => {
          setStatus('idle');
          setError('Payment cancelled');
        },
      },
    };

    const rzp = new Razorpay(options);
    rzp.open();
  };

  const openCashfree = (checkoutData: any, paymentId: string) => {
    // Cashfree checkout - redirect to their hosted page or use SDK
    // For simplicity, we'll redirect to the Cashfree checkout URL
    if (checkoutData.payment_session_id) {
      const cashfreeUrl = `https://payments.cashfree.com/orders/${checkoutData.order_id}/payments`;
      window.location.href = cashfreeUrl;
    } else {
      setError('Invalid Cashfree checkout data');
      setStatus('failed');
    }
  };

  const verifyPayment = async (paymentId: string, gatewayPaymentId: string, gatewayOrderId: string, signature?: string) => {
    setStatus('processing');
    setError(null);

    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: paymentId,
          gateway_payment_id: gatewayPaymentId,
          gateway_order_id: gatewayOrderId,
          signature,
        }),
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[PaymentCheckout] Verify payment - Non-JSON response:', text);
        throw new Error('Server error: Unable to verify payment. Please contact support if payment was deducted.');
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Payment verification failed');
      }

      setStatus('success');
      // Redirect to success page after a short delay
      setTimeout(() => {
        router.push(`/payment/success?payment_id=${paymentId}`);
      }, 1500);
    } catch (err: any) {
      console.error('[PaymentCheckout] Verify payment error:', err);
      setError(err.message || 'Payment verification failed');
      setStatus('failed');
    }
  };

  const handleRetry = () => {
    setStatus('idle');
    setError(null);
    initiatePayment();
  };

  const handleClose = () => {
    if (status === 'processing') {
      // Don't allow closing while processing
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-zinc-200 bg-white p-6 shadow-2xl">
        {status === 'initiating' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
            <div className="text-sm font-bold text-zinc-900">Initiating payment...</div>
          </div>
        )}

        {status === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="text-4xl">💳</div>
            <div className="text-sm font-bold text-zinc-900">Processing payment...</div>
            <div className="text-xs text-zinc-500">Please complete the payment in the popup</div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="text-5xl">✅</div>
            <div className="text-lg font-black text-zinc-900">Payment Successful!</div>
            <div className="text-xs text-zinc-500">Redirecting to confirmation page...</div>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <div className="text-5xl mb-4">❌</div>
              <h3 className="text-xl font-black text-zinc-900">Payment Failed</h3>
              {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-3 text-xs font-bold text-white transition hover:opacity-90"
              >
                Retry Payment
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {status === 'idle' && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-xl font-black text-zinc-900">Complete Payment</h3>
              {bookingName && <p className="mt-2 text-sm font-medium text-zinc-600">{bookingName}</p>}
              {amount && (
                <p className="mt-2 text-2xl font-black text-emerald-700">₹{amount.toLocaleString('en-IN')}</p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={initiatePayment}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-3 text-xs font-bold text-white transition hover:opacity-90"
              >
                Pay Now
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
