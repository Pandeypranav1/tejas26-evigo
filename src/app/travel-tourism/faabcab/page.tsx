"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/Container";
import { useAuth } from "@/context/AuthContext";
import { saveDemoBooking, getDemoUser } from "@/lib/demoStore";

const FAABCAB_SERVICES = [
  {
    id: "inter-city",
    title: "Inter-city One Way / Round Trip",
    icon: "🚕",
    description: "Comfortable cab services for one-way or round trips between Jamui, Patna, Deoghar, Gaya and other cities.",
    tag: "Popular",
  },
  {
    id: "local-rental",
    title: "Local Hourly Rental",
    icon: "⏱️",
    description: "Flexible hourly cab rentals with professional drivers for local sightseeing, shopping, and business in Jamui.",
    tag: "Flexible",
  },
  {
    id: "airport-transfer",
    title: "Airport Transfer",
    icon: "✈️",
    description: "Punctual airport pickups and drops to Patna (PAT), Deoghar (DGR), or Gaya (GAY) airports.",
    tag: "Punctual",
  },
  {
    id: "railway-pickup",
    title: "Railway Pickup & Drop",
    icon: "🚆",
    description: "Reliable station transfers for Jamui, Jhajha, Kiul, and Lakhisarai railway stations.",
    tag: "24x7",
  },
];

export default function FaabCabPartnerPage() {
  const { user } = useAuth();
  const formRef = useRef<HTMLDivElement>(null);

  const [selectedService, setSelectedService] = useState<string>("Inter-city One Way / Round Trip");

  // Form Fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [specialRequest, setSpecialRequest] = useState("");

  // States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Pre-fill user details if logged in
  useEffect(() => {
    if (user) {
      if (user.email && !customerEmail) setCustomerEmail(user.email);
    }
  }, [user]);

  const scrollToForm = (serviceTitle?: string) => {
    if (serviceTitle) setSelectedService(serviceTitle);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!customerName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!customerPhone.trim()) {
      setError("Please enter a valid phone number.");
      return;
    }
    if (!customerEmail.trim()) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!pickupLocation.trim()) {
      setError("Please enter the pickup location.");
      return;
    }
    if (!dropLocation.trim()) {
      setError("Please enter the destination / drop location.");
      return;
    }
    if (!travelDate) {
      setError("Please select a travel date.");
      return;
    }
    if (!pickupTime) {
      setError("Please select a pickup time.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Submit to Supabase API
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: "faab-cab",
          provider_name: "FaabCab",
          service_type: "Transport",
          transport_service: selectedService,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim(),
          pickup_location: pickupLocation.trim(),
          drop_location: dropLocation.trim(),
          travel_date: travelDate,
          pickup_time: pickupTime,
          passenger_count: Number(passengerCount),
          special_request: specialRequest.trim(),
          city: "Jamui, Bihar",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit transport request.");
      }

      // 2. Also save to demo store for local state compatibility
      const demoUser = getDemoUser();
      saveDemoBooking({
        providerId: "faab-cab",
        providerOwnerUid: "faab-cab-owner",
        clientUid: demoUser?.uid || user?.id || "guest",
        clientPhone: customerPhone.trim(),
        eventDate: travelDate,
        location: `${pickupLocation.trim()} → ${dropLocation.trim()}`,
        notes: `Service: ${selectedService} | Time: ${pickupTime} | Passengers: ${passengerCount}${specialRequest ? ` | ${specialRequest}` : ""}`,
      });

      setBookingId(data.booking?.id || `FC-${Math.floor(100000 + Math.random() * 900000)}`);
      setSuccess(true);
    } catch (err: any) {
      console.error("[FaabCab Booking Error]", err);
      setError(err.message || "Could not complete booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSuccess(false);
    setBookingId(null);
    setError(null);
    setPickupLocation("");
    setDropLocation("");
    setTravelDate("");
    setPickupTime("");
    setSpecialRequest("");
  };

  return (
    <div className="min-h-screen bg-[#05030f] text-white selection:bg-cyan-500/30 relative">
      {/* Background Lighting */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[140px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[140px]" />
      </div>

      {/* Hero Header Section */}
      <section className="relative pt-24 pb-14 overflow-hidden border-b border-white/10 z-10">
        <Container>
          <div className="max-w-4xl mx-auto text-center">
            {/* Nav Back Link */}
            <div className="flex justify-center mb-6">
              <Link
                href="/services/tourism"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Tourism & Heritage Trails
              </Link>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                🚗 Transport Partner
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-white/5 text-white/70 border border-white/10">
                📍 Jamui, Bihar
              </span>
            </div>

            {/* Partner Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4 text-white">
              FaabCab
            </h1>

            <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-2xl mx-auto mb-8">
              Official transport partner of Evigo providing reliable, safe, and comfortable cab services for inter-city journeys, local hourly rentals, airport transfers, and railway station pickups across Jamui and nearby regions.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => scrollToForm()}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-600 to-pink-500 text-white font-bold text-sm hover:scale-105 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all"
              >
                Book Transport →
              </button>
              <a
                href="https://faabcabs.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Visit FaabCab Website</span>
                <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* Services Grid Section */}
      <section className="py-14 md:py-20 z-10 relative">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block mb-2">
              Available Transport Services
            </span>
            <h2 className="text-3xl font-black text-white">
              Choose Your Journey Category
            </h2>
            <p className="text-sm text-white/60 mt-2">
              Select any service below to pre-select it in the booking form.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FAABCAB_SERVICES.map((svc) => {
              const isSelected = selectedService === svc.title;
              return (
                <div
                  key={svc.id}
                  onClick={() => scrollToForm(svc.title)}
                  className={`group relative rounded-3xl p-6 border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-gradient-to-b from-cyan-950/40 via-[#0f0a1e] to-violet-950/30 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.25)] scale-[1.02]"
                      : "bg-white/[0.04] border-white/10 hover:border-cyan-500/50 hover:bg-white/[0.07] hover:-translate-y-1"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
                        {svc.icon}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {svc.tag}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                      {svc.title}
                    </h3>
                    <p className="text-xs text-white/60 leading-relaxed mb-4">
                      {svc.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                      Select Service &rarr;
                    </span>
                    {isSelected && (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        ✓ Selected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Internal Transport Booking Section */}
      <section ref={formRef} className="py-14 md:py-20 border-t border-white/10 bg-[#070414] z-10 relative">
        <Container>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 mb-3">
                <span>📋</span> Evigo Internal Booking
              </div>
              <h2 className="text-3xl font-black text-white mb-2">
                Book FaabCab Transport
              </h2>
              <p className="text-sm text-white/60">
                Submit your journey request directly inside Evigo. Your request will be processed immediately by FaabCab.
              </p>
            </div>

            {/* Success State Banner */}
            {success ? (
              <div className="rounded-3xl p-8 bg-gradient-to-br from-emerald-950/50 via-[#0a1f18] to-cyan-950/40 border border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.2)] text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
                  ✅
                </div>
                <h3 className="text-2xl font-black text-white mb-2">
                  Transport Request Confirmed!
                </h3>
                <p className="text-sm text-emerald-300 font-medium mb-4">
                  Message sent successfully. Your booking is saved under ID:{" "}
                  <span className="font-bold text-white underline">{bookingId}</span>
                </p>
                <div className="max-w-md mx-auto bg-black/40 border border-white/10 rounded-2xl p-4 text-left text-xs space-y-2 mb-6 text-white/80">
                  <div><strong className="text-white">Service:</strong> {selectedService}</div>
                  <div><strong className="text-white">Pickup:</strong> {pickupLocation}</div>
                  <div><strong className="text-white">Destination:</strong> {dropLocation}</div>
                  <div><strong className="text-white">Date & Time:</strong> {travelDate} at {pickupTime}</div>
                  <div><strong className="text-white">Passenger(s):</strong> {passengerCount}</div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-xs font-bold transition-all hover:scale-105"
                  >
                    View in Client Dashboard →
                  </Link>
                  <button
                    onClick={handleResetForm}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white/20 transition-colors"
                  >
                    Book Another Journey
                  </button>
                </div>
              </div>
            ) : (
              /* Booking Form Card */
              <div className="rounded-3xl p-6 sm:p-10 bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Service Selector */}
                  <div>
                    <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-3">
                      Select Transport Service *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {FAABCAB_SERVICES.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedService(s.title)}
                          className={`p-3.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2.5 ${
                            selectedService === s.title
                              ? "bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span>{s.icon}</span>
                          <span className="truncate">{s.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Customer Information Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                        Customer Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Mobile number"
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                        Customer Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Locations Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                        Pickup Location *
                      </label>
                      <input
                        type="text"
                        required
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        placeholder="e.g. Jamui Railway Station / Hotel Brij"
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                        Destination / Drop Location *
                      </label>
                      <input
                        type="text"
                        required
                        value={dropLocation}
                        onChange={(e) => setDropLocation(e.target.value)}
                        placeholder="e.g. Patna Airport / Deoghar Temple"
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Date, Time & Passenger Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                        Travel Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                        Pickup Time *
                      </label>
                      <input
                        type="time"
                        required
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                        Number of Passengers *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        required
                        value={passengerCount}
                        onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Special Request */}
                  <div>
                    <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                      Special Request / Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={specialRequest}
                      onChange={(e) => setSpecialRequest(e.target.value)}
                      placeholder="e.g. Need AC sedan, extra luggage space, child seat..."
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
                    />
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-600 to-pink-500 text-white font-bold text-base hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Confirming Transport Request...</span>
                      </>
                    ) : (
                      <span>Confirm Transport Request ✓</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </Container>
      </section>
    </div>
  );
}
