"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/Container";
import { EVENT_VENUES } from "@/lib/constants";
import type { EventVenue } from "@/lib/constants";

/* ─── Booking Modal ─── */
function HotelBookingModal({
  venue,
  service,
  onClose,
}: {
  venue: EventVenue;
  service: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"details" | "done">("details");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isValid = date && guests && name && phone;

  const handleConfirm = async () => {
    if (!isValid || submitting) return;

    try {
      setSubmitting(true);

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider_id: venue.id,
          provider_name: venue.name,
          service_type: service,
          event_date: date,
          event_time: null,
          guest_count: Number(guests),
          customer_name: name,
          customer_phone: phone,
          customer_email: null,
          city: "Jamui, Bihar",
          message: notes || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Booking request failed");
      }

      setStep("done");
    } catch (error) {
      console.error("Booking submission error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to submit booking request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-[500px] relative"
        style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.3)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-lg cursor-pointer border-none hover:bg-zinc-200 transition"
        >
          ×
        </button>

        {step === "done" ? (
          <div className="text-center py-4">
            <div className="text-6xl mb-4">✅</div>

            <div className="text-xl font-black text-zinc-900">
              Request Sent!
            </div>

            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
              Your <strong>{service}</strong> booking request at{" "}
              <strong>{venue.name}</strong> has been submitted. Our team will
              contact you at <strong>{phone}</strong> within 24 hours.
            </p>

            <button
              onClick={onClose}
              className="mt-6 w-full py-3 rounded-xl text-sm font-bold text-white cursor-pointer border-none"
              style={{
                background: "linear-gradient(135deg,#8b5cf6,#06b6d4)",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <div className="text-[11px] font-bold text-violet-600 uppercase tracking-widest mb-1">
                {venue.name}
              </div>

              <div className="text-lg font-black text-zinc-900">
                {service}
              </div>

              <div className="text-xs text-zinc-500 mt-0.5">
                📍 {venue.address}
              </div>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                    Date
                  </span>

                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                    Guests / Rooms
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    placeholder="e.g. 2"
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                  Your Name
                </span>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                  Phone Number
                </span>

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                  Special Requests (optional)
                </span>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any special requirements..."
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none resize-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </label>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-zinc-200 bg-white text-sm font-bold text-zinc-600 cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirm}
                disabled={!isValid || submitting}
                className="flex-1 py-3 rounded-xl border-none text-sm font-bold text-white cursor-pointer transition-opacity"
                style={{
                  background:
                    "linear-gradient(135deg,#8b5cf6,#06b6d4)",
                  opacity: isValid && !submitting ? 1 : 0.4,
                }}
              >
                {submitting ? "Submitting..." : "Confirm Request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Hotel Card ─── */
function HotelDetailCard({ venue }: { venue: EventVenue }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const imgSrc = imgError ? "/evigo-hero.png" : venue.images[imgIdx];

  return (
    <div
      id={venue.id}
      className="bg-white rounded-3xl border border-zinc-200 overflow-hidden"
      style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}
    >
      {/* ── Image Carousel ── */}
      <div
        className="relative overflow-hidden bg-zinc-900"
        style={{ aspectRatio: "16/9" }}
      >
        <Image
          src={imgSrc}
          alt={`${venue.name} — photo ${imgIdx + 1}`}
          fill
          className="object-cover transition-all duration-500"
          sizes="(max-width: 768px) 100vw, 50vw"
          onError={() => setImgError(true)}
          priority={imgIdx === 0}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)",
          }}
        />

        {/* Rating badge */}
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1.5 rounded-full text-[13px] font-black text-zinc-900 bg-amber-400/95">
            ★ {venue.googleRating?.toFixed(1)} · {venue.reviewCount} reviews
          </span>
        </div>

        {/* Verified badge */}
        <div className="absolute top-4 left-4">
          <span
            className="px-3 py-1 rounded-full text-[11px] font-black text-white"
            style={{
              background: "rgba(6,182,212,0.9)",
              backdropFilter: "blur(6px)",
            }}
          >
            ✓ Verified Partner
          </span>
        </div>

        {/* Carousel arrows */}
        <button
          onClick={() =>
            setImgIdx(
              (imgIdx - 1 + venue.images.length) % venue.images.length
            )
          }
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white text-xl flex items-center justify-center cursor-pointer border-none hover:bg-black/70 transition backdrop-blur-sm"
        >
          ‹
        </button>

        <button
          onClick={() =>
            setImgIdx((imgIdx + 1) % venue.images.length)
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white text-xl flex items-center justify-center cursor-pointer border-none hover:bg-black/70 transition backdrop-blur-sm"
        >
          ›
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {venue.images.map((_, i) => (
            <button
              key={i}
              onClick={() => setImgIdx(i)}
              className="rounded-full transition-all duration-200 cursor-pointer border-none"
              style={{
                width: i === imgIdx ? 24 : 8,
                height: 8,
                background:
                  i === imgIdx
                    ? "#fff"
                    : "rgba(255,255,255,0.45)",
              }}
            />
          ))}
        </div>

        {/* Image counter */}
        <div className="absolute bottom-4 right-4 text-[11px] font-bold text-white/80 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
          {imgIdx + 1} / {venue.images.length}
        </div>
      </div>

      {/* ── Thumbnail strip ── */}
      <div className="flex gap-2 p-3 bg-zinc-50 border-b border-zinc-100 overflow-x-auto">
        {venue.images.map((img, i) => (
          <button
            key={i}
            onClick={() => setImgIdx(i)}
            className="flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200"
            style={{
              width: 72,
              height: 48,
              borderColor:
                i === imgIdx ? "#8b5cf6" : "transparent",
              opacity: i === imgIdx ? 1 : 0.6,
            }}
          >
            <div className="relative w-full h-full">
              <Image
                src={imgError ? "/evigo-hero.png" : img}
                alt={`${venue.name} photo ${i + 1}`}
                fill
                className="object-cover"
                sizes="72px"
              />
            </div>
          </button>
        ))}
      </div>

      {/* ── Info & Services ── */}
      <div className="p-5 sm:p-7 grid sm:grid-cols-2 gap-6">
        {/* Left: Info */}
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900">
            {venue.name}
          </h2>

          <div className="text-sm text-zinc-500 mt-1">
            📍 {venue.address}
          </div>

          {venue.description && (
            <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
              {venue.description}
            </p>
          )}

          {/* Safety badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {venue.safetyFeatures.map((f) => (
              <span
                key={f}
                className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                ✓ {f}
              </span>
            ))}
          </div>

          {/* Price */}
          {venue.priceRange && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-500">
                Starting from
              </span>

              <span
                className="text-lg font-black"
                style={{
                  background:
                    "linear-gradient(135deg,#8b5cf6,#06b6d4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {venue.priceRange}
              </span>
            </div>
          )}

          {/* Call button */}
          {venue.phone && (
            <a
              href={`tel:${venue.phone}`}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition no-underline"
            >
              📞 Call Hotel Directly
            </a>
          )}
        </div>

        {/* Right: Choose a Service */}
        <div>
          <div className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">
            Choose a Service to Book
          </div>

          <div className="flex flex-col gap-2.5">
            {venue.services.map((svc) => (
              <button
                key={svc}
                onClick={() => setSelectedService(svc)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold text-zinc-800 cursor-pointer text-left transition-all duration-200 hover:border-violet-300 hover:bg-violet-50 hover:shadow-md group"
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">
                    {svc.includes("Room")
                      ? "🛏️"
                      : svc.includes("Banquet")
                        ? "🎊"
                        : svc.includes("Restaurant") ||
                          svc.includes("Dining") ||
                          svc.includes("Café") ||
                          svc.includes("Catering")
                          ? "🍽️"
                          : svc.includes("Conference")
                            ? "💼"
                            : "✨"}
                  </span>

                  {svc}
                </span>

                <span className="text-violet-400 group-hover:translate-x-1 transition-transform duration-200">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {selectedService && (
        <HotelBookingModal
          venue={venue}
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  );
}

/* ─── Page ─── */
export default function HotelsPage() {
  return (
    <main className="flex-1 pb-16 sm:pb-24">
      {/* ── Hero Header ── */}
      <div
        className="py-10 sm:py-16 border-b border-zinc-100"
        style={{
          background:
            "linear-gradient(180deg,#faf5ff 0%,#f0f9ff 50%,#fff 100%)",
        }}
      >
        <Container>
          <div className="text-center">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 sm:mb-5 text-xs sm:text-[13px] font-bold text-cyan-700"
              style={{
                background: "rgba(6,182,212,0.09)",
                border: "1px solid rgba(6,182,212,0.25)",
              }}
            >
              🏨 {EVENT_VENUES.length} Verified Hotel Partners · Jamui, Bihar
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-[44px] font-black leading-tight">
              <span
                style={{
                  background:
                    "linear-gradient(135deg,#8b5cf6,#06b6d4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Our Hotel Partners
              </span>
            </h1>

            <p className="text-sm sm:text-[15px] text-zinc-500 mt-3 max-w-lg mx-auto leading-relaxed">
              Browse, compare, and book verified hotels across Jamui. Choose
              your hotel, then pick a service to start your booking.
            </p>

            {/* Quick-jump anchor pills */}
            <div className="flex flex-wrap justify-center gap-2 mt-5 sm:mt-6">
              {EVENT_VENUES.map((v) => (
                <a
                  key={v.id}
                  href={`#${v.id}`}
                  className="px-4 py-1.5 rounded-full text-[13px] font-bold text-zinc-600 bg-white border border-zinc-200 hover:border-violet-300 hover:text-violet-700 transition no-underline"
                >
                  {v.name}
                </a>
              ))}
            </div>
          </div>
        </Container>
      </div>

      {/* ── Hotel Cards ── */}
      <Container>
        <div className="mt-8 sm:mt-12 flex flex-col gap-8 sm:gap-12">
          {EVENT_VENUES.map((venue) => (
            <HotelDetailCard key={venue.id} venue={venue} />
          ))}
        </div>

        {/* ── Footer CTA ── */}
        <div
          className="mt-12 sm:mt-16 rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg,#1e1b4b,#312e81)",
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

          <div className="relative z-10">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">
              Need Help Choosing?
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
              Talk to Our Travel Desk
            </h3>

            <p className="text-sm text-white/70 max-w-md mx-auto mb-6 leading-relaxed">
              Our team can help you compare venues, check availability, and
              arrange a custom package for your event.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/contact"
                className="px-6 py-3 rounded-xl text-sm font-black text-white no-underline transition-all hover:-translate-y-0.5"
                style={{
                  background:
                    "linear-gradient(135deg,#8b5cf6,#06b6d4)",
                  boxShadow:
                    "0 4px 20px rgba(139,92,246,0.4)",
                }}
              >
                Contact Us →
              </Link>

              <Link
                href="/explore"
                className="px-6 py-3 rounded-xl text-sm font-black text-white no-underline transition-colors"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border:
                    "1px solid rgba(255,255,255,0.2)",
                }}
              >
                Explore All Services
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}