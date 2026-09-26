"use client";

import { useState } from "react";

interface BookingDetailsModalProps {
  booking: any | null;
  isOpen: boolean;
  onClose: () => void;
  onBookingUpdated: (updated: any) => void;
}

export function BookingDetailsModal({
  booking,
  isOpen,
  onClose,
  onBookingUpdated,
}: BookingDetailsModalProps) {
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const isTransport =
    booking.service_type === "Transport" ||
    booking.serviceType === "Transport" ||
    !!booking.pickup_location ||
    !!booking.pickupLocation;

  const currentStatus = (booking.status || "pending").toLowerCase();
  const isCancelled = currentStatus === "cancelled";
  const isRejected = currentStatus === "rejected";
  const isConfirmed = currentStatus === "confirmed" || currentStatus === "accepted";
  const isCompleted = currentStatus === "completed";
  const isPending = currentStatus === "pending";

  const isEligibleForCancellation = isPending || isConfirmed;

  const handleCancelBooking = async () => {
    setError(null);
    setCancelling(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: booking.id,
          action: "cancel",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel booking");
      }

      onBookingUpdated(data.booking || { ...booking, status: "cancelled", cancelled_at: new Date().toISOString() });
      setConfirmCancel(false);
    } catch (err: any) {
      setError(err.message || "Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  const providerName = booking.provider_name || booking.providerName || "Service Provider";
  const serviceTitle = booking.transport_service || booking.transportService || booking.service_type || booking.serviceType || "Booking";
  const eventDate = booking.travel_date || booking.travelDate || booking.event_date || booking.eventDate || "Scheduled";
  const eventTime = booking.pickup_time || booking.pickupTime || booking.event_time || booking.eventTime || "Flexible";
  const pickup = booking.pickup_location || booking.pickupLocation;
  const drop = booking.drop_location || booking.dropLocation;
  const passengers = booking.passenger_count || booking.passengerCount || booking.guest_count || booking.guestCount;
  const specialRequest = booking.message || booking.notes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#120b22] border border-white/15 p-6 sm:p-8 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                #{booking.id.slice(-8)}
              </span>
              <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor:
                    isCompleted ? "rgba(16,185,129,0.15)" :
                      isConfirmed ? "rgba(6,182,212,0.15)" :
                        isRejected ? "rgba(239,68,68,0.15)" :
                          isCancelled ? "rgba(156,163,175,0.15)" : "rgba(245,158,11,0.15)",
                  borderColor:
                    isCompleted ? "rgba(16,185,129,0.3)" :
                      isConfirmed ? "rgba(6,182,212,0.3)" :
                        isRejected ? "rgba(239,68,68,0.3)" :
                          isCancelled ? "rgba(156,163,175,0.3)" : "rgba(245,158,11,0.3)",
                  color:
                    isCompleted ? "#34d399" :
                      isConfirmed ? "#22d3ee" :
                        isRejected ? "#f87171" :
                          isCancelled ? "#9ca3af" : "#fbbf24",
                }}
              >
                {currentStatus}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {providerName}
            </h2>
            <div className="text-xs text-zinc-400 font-medium">
              {serviceTitle}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 mb-6">
          <div className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-4">
            Booking Progress Timeline
          </div>

          {isCancelled ? (
            <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-center">
              <span className="text-2xl mb-1 block">🚫</span>
              <div className="text-sm font-extrabold text-zinc-300">Booking Cancelled</div>
              <div className="text-xs text-zinc-400 mt-1">
                {booking.cancelled_at
                  ? `Cancelled on ${new Date(booking.cancelled_at).toLocaleString()}`
                  : "This booking request was cancelled."}
              </div>
            </div>
          ) : (
            <div className="relative flex items-center justify-between">
              {/* Connecting line */}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-white/10 -z-0" />

              {/* Step 1: Request Sent */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-cyan-500/40">
                  ✓
                </div>
                <span className="text-[11px] font-bold text-white mt-1.5">Request Sent</span>
                <span className="text-[9px] text-zinc-400">Created</span>
              </div>

              {/* Step 2: Waiting for Provider */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${isPending
                      ? "bg-amber-500 text-white ring-4 ring-amber-500/20 animate-pulse"
                      : "bg-cyan-500 text-white"
                    }`}
                >
                  {isPending ? "⏳" : "✓"}
                </div>
                <span className="text-[11px] font-bold text-white mt-1.5">Provider Review</span>
                <span className="text-[9px] text-zinc-400">
                  {isPending ? "Waiting response" : "Reviewed"}
                </span>
              </div>

              {/* Step 3: Confirmed / Rejected */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${isRejected
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/40"
                      : isConfirmed || isCompleted
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40"
                        : "bg-zinc-800 text-zinc-500 border border-white/10"
                    }`}
                >
                  {isRejected ? "✕" : isConfirmed || isCompleted ? "✓" : "3"}
                </div>
                <span
                  className={`text-[11px] font-bold mt-1.5 ${isRejected ? "text-red-400" : isConfirmed || isCompleted ? "text-emerald-400" : "text-zinc-500"
                    }`}
                >
                  {isRejected ? "Rejected" : "Confirmed"}
                </span>
                <span className="text-[9px] text-zinc-400">
                  {isRejected ? "Declined" : isConfirmed ? "Accepted" : "Awaiting"}
                </span>
              </div>

              {/* Step 4: Completed */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${isCompleted
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/40"
                      : "bg-zinc-800 text-zinc-500 border border-white/10"
                    }`}
                >
                  {isCompleted ? "★" : "4"}
                </div>
                <span
                  className={`text-[11px] font-bold mt-1.5 ${isCompleted ? "text-violet-300" : "text-zinc-500"
                    }`}
                >
                  Completed
                </span>
                <span className="text-[9px] text-zinc-400">
                  {isCompleted ? "Finished" : "Final Step"}
                </span>
              </div>
            </div>
          )}

          {/* Rejection Reason Notice */}
          {isRejected && booking.rejection_reason && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200">
              <strong>Provider Rejection Note:</strong> "{booking.rejection_reason}"
            </div>
          )}
        </div>

        {/* Detailed Info Grid */}
        <div className="space-y-4 text-xs font-medium">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div>
              <span className="text-zinc-400 block mb-0.5">Provider</span>
              <span className="font-bold text-white">{providerName}</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Service</span>
              <span className="font-bold text-white">{serviceTitle}</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Booking ID</span>
              <span className="font-mono font-bold text-white">#{booking.id.slice(-8)}</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Status</span>
              <span className="font-bold text-white">{currentStatus}</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Customer Name</span>
              <span className="font-bold text-white">{booking.customer_name || booking.customerName || "Customer"}</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Customer Phone</span>
              <span className="font-bold text-white">{booking.customer_phone || booking.customerPhone || "Not provided"}</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Customer Email</span>
              <span className="font-bold text-white break-all">{booking.customer_email || booking.customerEmail || "Not provided"}</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Created At</span>
              <span className="font-bold text-white">{new Date(booking.created_at || Date.now()).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Travel / Event Date</span>
              <span className="font-bold text-white">📅 {eventDate}</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Time</span>
              <span className="font-bold text-white">⏰ {eventTime}</span>
            </div>
            {passengers && (
              <div>
                <span className="text-zinc-400 block mb-0.5">Passengers / Guests</span>
                <span className="font-bold text-white">👥 {passengers} Persons</span>
              </div>
            )}
          </div>

          {isTransport && (pickup || drop) && (
            <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 space-y-2">
              <div className="text-xs font-black text-cyan-400 uppercase tracking-wider">
                🚗 Transport Route
              </div>
              {pickup && (
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400">🟢</span>
                  <div>
                    <span className="text-zinc-400 text-[11px] block">Pickup Location</span>
                    <span className="font-bold text-white">{pickup}</span>
                  </div>
                </div>
              )}
              {drop && (
                <div className="flex items-start gap-2">
                  <span className="text-red-400">🔴</span>
                  <div>
                    <span className="text-zinc-400 text-[11px] block">Destination</span>
                    <span className="font-bold text-white">{drop}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {specialRequest && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <span className="text-zinc-400 block text-[11px] mb-1 uppercase font-bold">
                Special Request / Instructions
              </span>
              <p className="text-zinc-200 italic font-normal">"{specialRequest}"</p>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-semibold text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* Cancel Confirmation Prompt */}
        {confirmCancel ? (
          <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 animate-in fade-in duration-150">
            <div className="text-sm font-black text-red-300 mb-1">
              Are you sure you want to cancel this booking?
            </div>
            <p className="text-xs text-zinc-300 mb-3 font-normal">
              This will update your booking status to cancelled and notify {providerName}.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel Booking"}
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
            {isEligibleForCancellation ? (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="px-4 py-2 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-colors"
              >
                Cancel Booking
              </button>
            ) : (
              <div className="text-[11px] text-zinc-500 font-medium">
                {isCancelled
                  ? "Booking is cancelled"
                  : isCompleted
                    ? "Completed bookings cannot be cancelled"
                    : isRejected
                      ? "Rejected bookings cannot be cancelled"
                      : ""}
              </div>
            )}

            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors ml-auto"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
