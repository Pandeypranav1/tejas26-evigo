'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { Button } from '@/components/Button';

type PaymentDetails = {
  id: string;
  amount: number;
  status: string;
  booking_id?: string;
  combo_booking_id?: string;
  paid_at?: string;
  gateway?: string;
};

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId) {
      router.replace('/dashboard');
      return;
    }

    fetchPaymentDetails();
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      const response = await fetch(`/api/payments/${paymentId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setPayment(data.payment);
      }
    } catch (error) {
      console.error('[PaymentSuccess] Failed to fetch payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Loading payment details...
          </span>
        </div>
      </div>
    );
  }

  const bookingId = payment?.booking_id || payment?.combo_booking_id;

  return (
    <main className="flex-1 py-10 bg-zinc-50 min-h-[90vh]">
      <Container>
        <div className="max-w-2xl mx-auto">
          <div className="rounded-[28px] border border-emerald-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-4xl">✅</span>
              </div>

              <div>
                <h1 className="text-3xl font-black text-zinc-900">Payment Successful!</h1>
                <p className="mt-2 text-sm font-medium text-zinc-600">
                  Your payment has been processed successfully
                </p>
              </div>

              {payment && (
                <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-left">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Payment ID</span>
                      <span className="text-xs font-mono font-bold text-zinc-900">#{String(payment.id).slice(-8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Amount</span>
                      <span className="text-sm font-bold text-emerald-700">₹{payment.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Status</span>
                      <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                        {payment.status}
                      </span>
                    </div>
                    {payment.paid_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Paid At</span>
                        <span className="text-xs font-semibold text-zinc-900">
                          {new Date(payment.paid_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {payment.gateway && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Gateway</span>
                        <span className="text-xs font-semibold text-zinc-900 capitalize">{payment.gateway}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 w-full max-w-sm">
                <Link href="/dashboard" className="w-full">
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-xs">
                    Back to Dashboard
                  </Button>
                </Link>
                {bookingId && (
                  <Link href="/dashboard" className="w-full">
                    <Button variant="secondary" className="w-full text-xs font-bold">
                      View Booking
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500">
              A confirmation email has been sent to your registered email address.
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Loading...
          </span>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
