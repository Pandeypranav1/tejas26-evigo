"use client";

import { useState } from "react";

interface RejectBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any | null;
  onRejected: (updatedBooking: any) => void;
}

export function RejectBookingModal({
  isOpen,
  onClose,
  booking,
  onRejected,
}: RejectBookingModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for rejecting this booking request.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: booking.id,
          status: "rejected",
          rejection_reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reject booking");
      }

      onRejected(data.booking || {
        ...booking,
        status: "rejected",
        rejection_reason: reason.trim(),
        provider_response_at: new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit rejection");
    } finally {
      setSubmitting(false);
    }
  };

  const customerName = booking.customer_name || booking.customerName || "Customer";
  const serviceName = booking.transport_service || booking.transportService || booking.service_type || booking.serviceType || "Service";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[#120b22] border border-white/15 p-6 sm:p-7 shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-sm">
              ✕
            </span>
            <h2 className="text-lg font-black text-white">Decline Booking</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 mb-4 text-xs">
          <div className="text-zinc-400 mb-1">
            Declining request for <strong className="text-white">{customerName}</strong>
          </div>
          <div className="text-zinc-400">
            Service: <strong className="text-cyan-400">{serviceName}</strong> (ID: #{booking.id.slice(-8)})
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-semibold text-red-300">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Reason for Rejection <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Vehicle already reserved for this time slot, driver unavailable, or date fully booked."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 text-white text-xs outline-none transition-all placeholder:text-zinc-600 resize-none"
            />
            <span className="text-[11px] text-zinc-500 block mt-1">
              This note will be sent directly to the customer in their notification and email.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Declining...
                </>
              ) : (
                "Confirm Decline"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
