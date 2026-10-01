"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ComboPack, ComboBooking, COMBO_CATEGORY_METADATA } from "@/lib/combo";
import { useAuth } from "@/context/AuthContext";

interface ComboBookingModalProps {
  pack: ComboPack;
  onClose: () => void;
  onBookingSuccess?: (booking: ComboBooking) => void;
}

export function ComboBookingModal({ pack, onClose, onBookingSuccess }: ComboBookingModalProps) {
  const { user } = useAuth();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState(user?.email || "");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0]
  );
  const [guestCount, setGuestCount] = useState(1);
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityState, setAvailabilityState] = useState<{
    available: boolean;
    reason?: string;
  }>({ available: true });

  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<ComboBooking | null>(null);

  const meta = COMBO_CATEGORY_METADATA[pack.category] || {
    icon: "🎁",
    gradient: "from-cyan-500 to-violet-600",
  };

  const hasTransport = (pack.items || []).some(
    (item) =>
      item.service_type.toLowerCase().includes("transport") ||
      item.service_type.toLowerCase().includes("transfer") ||
      item.service_type.toLowerCase().includes("cab")
  );

  // Check availability on date change
  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!startDate) return;
      setCheckingAvailability(true);
      try {
        const res = await fetch("/api/combo-packs/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            combo_pack_id: pack.id,
            start_date: startDate,
            end_date: endDate,
          }),
        });
        const data = await res.json();
        if (active) {
          if (res.ok && data.success) {
            setAvailabilityState({
              available: data.isAvailable !== false,
              reason: data.reason,
            });
          }
        }
      } catch (err) {
        console.warn("[ComboBookingModal] Availability check error:", err);
      } finally {
        if (active) setCheckingAvailability(false);
      }
    };

    check();
    return () => {
      active = false;
    };
  }, [pack.id, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!customerName.trim() || !customerPhone.trim() || !startDate) {
      setBookingError("Please fill in your name, contact phone number, and scheduled start date.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        combo_pack_id: pack.id,
        slug: pack.slug,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || undefined,
        start_date: startDate,
        end_date: endDate || startDate,
        guest_count: guestCount,
        pickup_location: pickupLocation.trim() || undefined,
        drop_location: dropLocation.trim() || undefined,
        special_requests: specialRequests.trim() || undefined,
      };

      const res = await fetch("/api/combo-packs/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to complete combo booking");
      }

      setConfirmedBooking(data.booking);
      onBookingSuccess?.(data.booking);
    } catch (err: any) {
      setBookingError(err.message || "An unexpected error occurred while booking this combo pack.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative my-8 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/20 bg-[#0d091e] text-white shadow-2xl shadow-black/80">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/70 text-xl text-white transition-colors hover:bg-black"
        >
          ✕
        </button>

        {!confirmedBooking ? (
          <div>
            {/* Header Image */}
            <div className="relative aspect-[16/8] w-full bg-zinc-900">
              {pack.image_url ? (
                <Image
                  src={pack.image_url}
                  alt={pack.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl">
                  {meta.icon}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d091e] via-[#0d091e]/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-300 border border-cyan-500/30">
                    {meta.icon} {pack.category}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-300">
                    📍 {pack.city}
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                  {pack.name}
                </h2>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Description */}
              <div>
                <p className="text-sm leading-relaxed text-zinc-300">
                  {pack.description}
                </p>
              </div>

              {/* Included Services Breakdown */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400">
                  Included Verified Services ({pack.items?.length || 0})
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {pack.items && pack.items.length > 0 ? (
                    pack.items.map((item, i) => (
                      <div
                        key={item.id || i}
                        className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-cyan-500/20 text-xs font-bold text-cyan-300">
                          ✓
                        </span>
                        <div>
                          <div className="text-sm font-bold text-white">
                            {item.service_type}
                            {item.quantity > 1 && ` (x${item.quantity})`}
                          </div>
                          <div className="text-xs text-zinc-400">
                            {item.provider_name || "Verified Evigo Partner Provider"}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-400">
                      Standard package services bundle
                    </div>
                  )}
                </div>
              </div>

              {/* Price Summary Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4">
                <div>
                  <div className="text-xs font-semibold text-cyan-300">
                    Total Package Price
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-black text-white">
                      ₹{pack.final_price.toLocaleString("en-IN")}
                    </span>
                    {pack.discount > 0 && (
                      <>
                        <span className="text-sm text-zinc-400 line-through">
                          ₹{pack.base_price.toLocaleString("en-IN")}
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                          Save ₹{pack.discount.toLocaleString("en-IN")}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right text-xs text-zinc-300">
                  <div>⏱️ Duration: <strong>{pack.duration}</strong></div>
                  <div>⚡ Realtime Provider Matching</div>
                </div>
              </div>

              {/* Availability Notice */}
              {!availabilityState.available && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
                  ⚠️ {availabilityState.reason || "This date may have limited availability."}
                </div>
              )}

              {/* Booking Form */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400">
                  Reserve This Combo Package
                </h3>

                {bookingError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    {bookingError}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. rahul@example.com"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Number of Guests / Travelers
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={guestCount}
                      onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {hasTransport && (
                  <div className="grid gap-4 sm:grid-cols-2 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Pickup Location / Station / Hotel
                      </label>
                      <input
                        type="text"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        placeholder="e.g. Jamui Railway Station"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Drop / Tour Destination
                      </label>
                      <input
                        type="text"
                        value={dropLocation}
                        onChange={(e) => setDropLocation(e.target.value)}
                        placeholder="e.g. Simultala / Hotel Usha Nand Palace"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Special Requests / Custom Notes
                  </label>
                  <textarea
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="e.g. Vegetarian meal preferences, child seating, extra room request..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-zinc-400">
                    🔒 Direct real-time booking via verified providers.
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || checkingAvailability}
                    className="w-full sm:w-auto min-w-[200px] rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 hover:brightness-110 disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Confirming Combo...</span>
                      </span>
                    ) : (
                      `Book Combo (₹${pack.final_price.toLocaleString("en-IN")})`
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Confirmation Success State */
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-emerald-500/20 border border-emerald-500/30 text-4xl text-emerald-400">
              🎉
            </div>

            <div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/20">
                Combo Request Placed Successfully
              </span>
              <h2 className="mt-3 text-3xl font-black text-white">
                Booking ID #{confirmedBooking.id.slice(-6).toUpperCase()}
              </h2>
              <p className="mt-2 text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
                Your combo booking for <strong>{confirmedBooking.combo_name || pack.name}</strong> has been transmitted to assigned providers in real time.
              </p>
            </div>

            {/* Item Status Breakdown */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left max-w-lg mx-auto">
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
                Included Services Status
              </div>
              <div className="space-y-2.5">
                {confirmedBooking.items && confirmedBooking.items.length > 0 ? (
                  confirmedBooking.items.map((it, idx) => (
                    <div
                      key={it.id || idx}
                      className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{it.service_type}</div>
                        <div className="text-zinc-400">{it.provider_name || "Provider"}</div>
                      </div>
                      <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-300 border border-amber-500/30">
                        {it.provider_booking_status || "pending"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-zinc-400">All child services initialized.</div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/dashboard"
                onClick={onClose}
                className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 hover:scale-105 transition-all"
              >
                View in Client Dashboard →
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-xs font-bold text-white hover:bg-white/20 transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
