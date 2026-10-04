"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Container } from "@/components/Container";
import { useAuth } from "@/context/AuthContext";
import { saveDemoBooking, getDemoUser } from "@/lib/demoStore";
import { CalendarDays, Clock3, MapPin, UsersRound } from "lucide-react";

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

type BookingField =
  | "pickupLocation"
  | "dropLocation"
  | "travelDate"
  | "pickupTime"
  | "passengerCount"
  | "selectedService"
  | "customerName"
  | "customerPhone"
  | "customerEmail";

type BookingErrors = Partial<Record<BookingField, string>>;

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
  const [fieldErrors, setFieldErrors] = useState<BookingErrors>({});
  const [bookingStage, setBookingStage] = useState<"details" | "review" | "confirmed">("details");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState("pending");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "initiating" | "processing" | "success" | "failed">("idle");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Reset and pre-fill user details on auth change
  useEffect(() => {
    if (user) {
      // Set email from Supabase if not already set
      if (user.email && !customerEmail) setCustomerEmail(user.email);
      // Clear any previous booking data for new session
      setCustomerName("");
      setCustomerPhone("");
      setBookingStage("details");
      setBookingId(null);
      setBookingStatus("pending");
      setError(null);
      setFieldErrors({});
    } else {
      // User signed out – clear all form state
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setBookingStage("details");
      setBookingId(null);
      setBookingStatus("pending");
      setError(null);
      setFieldErrors({});
    }
  }, [user]);

  const scrollToForm = (serviceTitle?: string) => {
    if (serviceTitle) setSelectedService(serviceTitle);
    setBookingStage("details");
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const clearFieldError = (field: BookingField) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const nextErrors: BookingErrors = {};

    if (!pickupLocation.trim()) nextErrors.pickupLocation = "Enter a pickup location.";
    if (!dropLocation.trim()) nextErrors.dropLocation = "Enter a destination.";
    const today = new Date();
    const todayLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (!travelDate) nextErrors.travelDate = "Select a travel date.";
    else if (travelDate < todayLocal) nextErrors.travelDate = "Choose today or a future date.";
    if (!pickupTime) nextErrors.pickupTime = "Select a pickup time.";
    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 20) {
      nextErrors.passengerCount = "Choose between 1 and 20 passengers.";
    }
    if (!FAABCAB_SERVICES.some((service) => service.title === selectedService)) {
      nextErrors.selectedService = "Select a FaabCab service.";
    }
    if (!customerName.trim()) nextErrors.customerName = "Enter your name.";
    if (!customerPhone.trim()) nextErrors.customerPhone = "Enter a phone number.";
    if (!customerEmail.trim()) nextErrors.customerEmail = "Enter an email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      nextErrors.customerEmail = "Enter a valid email address.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setBookingStage("review");
  };

  const handleConfirmBooking = async () => {
    if (submitting || bookingStage !== "review") return;
    setError(null);
    setPaymentError(null);
    setSubmitting(true);
    setPaymentStatus("initiating");

    try {
      const matchedService = FAABCAB_SERVICES.find((s) => s.title === selectedService);
      const serviceId = matchedService?.id || "inter-city";

      // 1. Submit to Supabase API to create booking
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: user?.id || null,
          provider_id: "faab-cab",
          provider_uuid: "6105241d-1d38-4274-b912-eea67f4c32b0",
          service_id: serviceId,
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
          message: specialRequest.trim() || null,
          city: "Jamui, Bihar",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit transport request.");
      }

      const newBookingId = data.booking?.id ? String(data.booking.id) : null;
      setBookingId(newBookingId);
      setBookingStatus(data.booking?.status || "pending");

      // 2. If booking already existed (idempotency), skip payment initiation
      if (data.is_existing && data.booking?.payment_status === 'paid') {
        setPaymentStatus("success");
        setBookingStage("confirmed");
        setSubmitting(false);
        return;
      }

      // 3. Initiate payment
      setPaymentStatus("processing");
      const paymentRes = await fetch(`/api/bookings/${newBookingId}/initiate-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method: "upi" }),
      });

      // Handle non-JSON responses
      const contentType = paymentRes.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await paymentRes.text();
        console.error("[FaabCab] Payment initiation - Non-JSON response:", text);
        throw new Error("Payment service temporarily unavailable. Please try again.");
      }

      const paymentData = await paymentRes.json();
      if (!paymentRes.ok || !paymentData.success) {
        throw new Error(paymentData.error || "Failed to initiate payment.");
      }

      // 4. Load Razorpay script and open checkout
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        const options = {
          key: "rzp_test_Tj7eWV9vwhI5lG", // Razorpay test key ID
          amount: paymentData.amount * 100, // Convert to paise
          currency: "INR",
          name: "Evigo",
          description: `FaabCab Transport - ${selectedService}`,
          order_id: paymentData.checkout_data?.order_id,
          prefill: {
            name: customerName.trim(),
            email: customerEmail.trim(),
            contact: customerPhone.trim(),
          },
          theme: {
            color: "#10b981",
          },
          handler: async (response: any) => {
            // Payment successful - verify server-side
            try {
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  payment_id: paymentData.payment_id,
                  gateway_payment_id: response.razorpay_payment_id,
                  gateway_order_id: response.razorpay_order_id,
                  signature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                setPaymentStatus("success");
                setBookingStage("confirmed");
                // Also save to demo store for local state compatibility
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
              } else {
                throw new Error(verifyData.error || "Payment verification failed.");
              }
            } catch (err: any) {
              console.error("[FaabCab] Payment verification error:", err);
              setPaymentStatus("failed");
              setPaymentError(err.message || "Payment verification failed. Please contact support if payment was deducted.");
            } finally {
              setSubmitting(false);
            }
          },
          modal: {
            ondismiss: () => {
              setPaymentStatus("idle");
              setSubmitting(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      };
      script.onerror = () => {
        setPaymentStatus("failed");
        setPaymentError("Failed to load payment gateway. Please try again.");
        setSubmitting(false);
      };
      document.body.appendChild(script);
    } catch (err: any) {
      console.error("[FaabCab Booking Error]", err);
      const message = typeof err?.message === "string" ? err.message : "";
      setError(
        message && message !== "Failed to fetch" && !message.includes("Something went wrong")
          ? message
          : "Unable to create the booking right now. Please review the details and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setBookingStage("details");
    setBookingId(null);
    setBookingStatus("pending");
    setError(null);
    setFieldErrors({});
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail(user?.email || "");
    setPickupLocation("");
    setDropLocation("");
    setTravelDate("");
    setPickupTime("");
    setPassengerCount(1);
    setSelectedService("Inter-city One Way / Round Trip");
    setSpecialRequest("");
  };

  const displayDate = travelDate
    ? new Date(`${travelDate}T00:00:00`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : "Choose a date";

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
                href="/travel-tourism"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Travel & Tourism
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
                <button
                  type="button"
                  key={svc.id}
                  onClick={() => scrollToForm(svc.title)}
                  aria-pressed={isSelected}
                  className={`group relative w-full rounded-3xl p-6 border text-left transition-all duration-300 cursor-pointer flex flex-col justify-between ${isSelected
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
                    <span className="block text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                      {svc.title}
                    </span>
                    <span className="mb-4 block text-xs leading-relaxed text-white/60">
                      {svc.description}
                    </span>
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
                </button>
              );
            })}
          </div>
        </Container>
      </section>

      <section ref={formRef} className="relative z-10 border-t border-white/10 bg-[#09090b] py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-2 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Evigo booking</p>
                <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Plan your FaabCab ride</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
                  Enter your journey, review every detail, then confirm your request.
                </p>
              </div>
            </div>

            {bookingStage === "confirmed" ? (
              <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-400/30 bg-[#111714] p-5 sm:p-8">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-2xl text-emerald-300">✓</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Booking Confirmed</p>
                    <h3 className="mt-1 text-2xl font-black text-white">Your request is with FaabCab</h3>
                    {bookingId && <p className="mt-2 font-mono text-sm text-white/70">Reference #{bookingId}</p>}
                  </div>
                </div>
                <div className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm sm:grid-cols-2">
                  <div><span className="block text-xs text-white/50">Route</span><span className="mt-1 block font-semibold text-white">{pickupLocation} → {dropLocation}</span></div>
                  <div><span className="block text-xs text-white/50">Travel date &amp; time</span><span className="mt-1 block font-semibold text-white">{displayDate} · {pickupTime}</span></div>
                  <div><span className="block text-xs text-white/50">Passengers</span><span className="mt-1 block font-semibold text-white">{passengerCount}</span></div>
                  <div><span className="block text-xs text-white/50">Selected service</span><span className="mt-1 block font-semibold text-white">{selectedService}</span></div>
                  <div><span className="block text-xs text-white/50">Status</span><span className="mt-1 block font-semibold capitalize text-white">{bookingStatus}</span></div>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/dashboard" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-emerald-400 px-5 text-sm font-black text-zinc-950 transition hover:bg-emerald-300">
                    View Booking
                  </Link>
                  <button type="button" onClick={handleResetForm} className="min-h-12 flex-1 rounded-xl border border-white/15 px-5 text-sm font-bold text-white transition hover:bg-white/5">
                    Book Another Journey
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0">
                  <ol className="mb-6 grid grid-cols-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-xs sm:text-sm">
                    {["Fill Details", "Review Booking", "Confirm & Book"].map((label, index) => {
                      const active = bookingStage === "details" ? index === 0 : index === 1;
                      const complete = bookingStage === "review" && index === 0;
                      return (
                        <li key={label} className={`flex min-h-12 items-center justify-center gap-2 px-2 text-center font-bold ${active ? "bg-emerald-400/10 text-emerald-200" : complete ? "text-emerald-300" : "text-white/45"}`}>
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-[11px]">{complete ? "✓" : index + 1}</span>
                          <span>{label}</span>
                        </li>
                      );
                    })}
                  </ol>

                  {bookingStage === "details" ? (
                    <form onSubmit={handleReview} noValidate className="space-y-5">
                      <section className="rounded-2xl border border-white/10 bg-[#111214] p-4 sm:p-6">
                        <div className="mb-5">
                          <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Step 1</p>
                          <h3 className="mt-1 text-xl font-black text-white">Journey</h3>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block min-w-0">
                            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/85"><MapPin size={16} aria-hidden="true" /> Pickup location</span>
                            <input type="text" value={pickupLocation} onChange={(event) => { setPickupLocation(event.target.value); clearFieldError("pickupLocation"); }} placeholder="Railway station, hotel or address" aria-invalid={Boolean(fieldErrors.pickupLocation)} className="min-h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-base text-white outline-none placeholder:text-white/35 focus:border-emerald-300" />
                            {fieldErrors.pickupLocation && <span className="mt-1.5 block text-sm text-rose-300">{fieldErrors.pickupLocation}</span>}
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/85"><MapPin size={16} aria-hidden="true" /> Drop location</span>
                            <input type="text" value={dropLocation} onChange={(event) => { setDropLocation(event.target.value); clearFieldError("dropLocation"); }} placeholder="Destination or drop address" aria-invalid={Boolean(fieldErrors.dropLocation)} className="min-h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-base text-white outline-none placeholder:text-white/35 focus:border-emerald-300" />
                            {fieldErrors.dropLocation && <span className="mt-1.5 block text-sm text-rose-300">{fieldErrors.dropLocation}</span>}
                          </label>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-white/10 bg-[#111214] p-4 sm:p-6">
                        <div className="mb-5">
                          <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Step 2</p>
                          <h3 className="mt-1 text-xl font-black text-white">Trip details</h3>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <label className="block min-w-0">
                            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/85"><CalendarDays size={16} aria-hidden="true" /> Travel date</span>
                            <input type="date" value={travelDate} onChange={(event) => { setTravelDate(event.target.value); clearFieldError("travelDate"); }} aria-invalid={Boolean(fieldErrors.travelDate)} className="min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-base text-white outline-none focus:border-emerald-300" />
                            {fieldErrors.travelDate && <span className="mt-1.5 block text-sm text-rose-300">{fieldErrors.travelDate}</span>}
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/85"><Clock3 size={16} aria-hidden="true" /> Pickup time</span>
                            <input type="time" value={pickupTime} onChange={(event) => { setPickupTime(event.target.value); clearFieldError("pickupTime"); }} aria-invalid={Boolean(fieldErrors.pickupTime)} className="min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-base text-white outline-none focus:border-emerald-300" />
                            {fieldErrors.pickupTime && <span className="mt-1.5 block text-sm text-rose-300">{fieldErrors.pickupTime}</span>}
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/85"><UsersRound size={16} aria-hidden="true" /> Passengers</span>
                            <input type="number" min={1} max={20} value={passengerCount || ""} onChange={(event) => { setPassengerCount(event.target.value === "" ? 0 : Number(event.target.value)); clearFieldError("passengerCount"); }} aria-invalid={Boolean(fieldErrors.passengerCount)} className="min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-base text-white outline-none focus:border-emerald-300" />
                            {fieldErrors.passengerCount && <span className="mt-1.5 block text-sm text-rose-300">{fieldErrors.passengerCount}</span>}
                          </label>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-white/10 bg-[#111214] p-4 sm:p-6">
                        <div className="mb-5">
                          <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Step 3</p>
                          <h3 className="mt-1 text-xl font-black text-white">Service &amp; contact details</h3>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {FAABCAB_SERVICES.map((service) => (
                            <button key={service.id} type="button" aria-pressed={selectedService === service.title} onClick={() => { setSelectedService(service.title); clearFieldError("selectedService"); }} className={`flex min-h-20 items-start gap-3 rounded-xl border p-4 text-left transition ${selectedService === service.title ? "border-emerald-300 bg-emerald-300/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}>
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-xl">{service.icon}</span>
                              <span className="min-w-0">
                                <span className="block text-sm font-bold text-white">{service.title}</span>
                                <span className="mt-1 block text-xs leading-5 text-white/55">{service.description}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                        {fieldErrors.selectedService && <p className="mt-2 text-sm text-rose-300">{fieldErrors.selectedService}</p>}

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                          <label className="block min-w-0">
                            <span className="mb-2 block text-sm font-semibold text-white/85">Your name</span>
                            <input type="text" value={customerName} onChange={(event) => { setCustomerName(event.target.value); clearFieldError("customerName"); }} autoComplete="name" aria-invalid={Boolean(fieldErrors.customerName)} className="min-h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-base text-white outline-none focus:border-emerald-300" />
                            {fieldErrors.customerName && <span className="mt-1.5 block text-sm text-rose-300">{fieldErrors.customerName}</span>}
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-2 block text-sm font-semibold text-white/85">Phone number</span>
                            <input type="tel" value={customerPhone} onChange={(event) => { setCustomerPhone(event.target.value); clearFieldError("customerPhone"); }} autoComplete="tel" aria-invalid={Boolean(fieldErrors.customerPhone)} className="min-h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-base text-white outline-none focus:border-emerald-300" />
                            {fieldErrors.customerPhone && <span className="mt-1.5 block text-sm text-rose-300">{fieldErrors.customerPhone}</span>}
                          </label>
                          <label className="block min-w-0 sm:col-span-2">
                            <span className="mb-2 block text-sm font-semibold text-white/85">Email address</span>
                            <input type="email" value={customerEmail} onChange={(event) => { setCustomerEmail(event.target.value); clearFieldError("customerEmail"); }} autoComplete="email" aria-invalid={Boolean(fieldErrors.customerEmail)} className="min-h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-base text-white outline-none focus:border-emerald-300" />
                            {fieldErrors.customerEmail && <span className="mt-1.5 block text-sm text-rose-300">{fieldErrors.customerEmail}</span>}
                          </label>
                          <label className="block min-w-0 sm:col-span-2">
                            <span className="mb-2 block text-sm font-semibold text-white/85">Special request <span className="font-normal text-white/45">(optional)</span></span>
                            <textarea rows={3} value={specialRequest} onChange={(event) => setSpecialRequest(event.target.value)} placeholder="Luggage space, accessibility needs or other notes" className="w-full resize-y rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-base text-white outline-none placeholder:text-white/35 focus:border-emerald-300" />
                          </label>
                        </div>
                      </section>

                      <button type="submit" className="min-h-14 w-full rounded-xl bg-emerald-400 px-5 text-base font-black text-zinc-950 transition hover:bg-emerald-300">
                        Review Booking <span aria-hidden="true">→</span>
                      </button>
                    </form>
                  ) : (
                    <section className="rounded-2xl border border-white/10 bg-[#111214] p-4 sm:p-6">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Review Booking</p>
                      <h3 className="mt-1 text-xl font-black text-white">Check your journey details</h3>
                      <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                        <div><dt className="text-xs text-white/50">Pickup → Drop</dt><dd className="mt-1 break-words text-sm font-semibold text-white">{pickupLocation} → {dropLocation}</dd></div>
                        <div><dt className="text-xs text-white/50">Travel date</dt><dd className="mt-1 text-sm font-semibold text-white">{displayDate}</dd></div>
                        <div><dt className="text-xs text-white/50">Pickup time</dt><dd className="mt-1 text-sm font-semibold text-white">{pickupTime}</dd></div>
                        <div><dt className="text-xs text-white/50">Passengers</dt><dd className="mt-1 text-sm font-semibold text-white">{passengerCount}</dd></div>
                        <div><dt className="text-xs text-white/50">Selected service</dt><dd className="mt-1 text-sm font-semibold text-white">{selectedService}</dd></div>
                        <div><dt className="text-xs text-white/50">Customer</dt><dd className="mt-1 text-sm font-semibold text-white">{customerName}</dd></div>
                        <div><dt className="text-xs text-white/50">Phone</dt><dd className="mt-1 text-sm font-semibold text-white">{customerPhone}</dd></div>
                        <div><dt className="text-xs text-white/50">Email</dt><dd className="mt-1 break-all text-sm font-semibold text-white">{customerEmail}</dd></div>
                        {specialRequest && <div className="sm:col-span-2"><dt className="text-xs text-white/50">Special request</dt><dd className="mt-1 text-sm font-semibold text-white">{specialRequest}</dd></div>}
                      </dl>
                      {error && <div role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm font-medium text-rose-200">{error}</div>}
                      <button type="button" onClick={() => { setBookingStage("details"); setError(null); }} className="mt-6 min-h-12 w-full rounded-xl border border-white/15 px-4 text-sm font-bold text-white transition hover:bg-white/5">
                        Edit details
                      </button>
                    </section>
                  )}
                </div>

                <aside className="rounded-2xl border border-white/10 bg-[#111714] p-5 sm:p-6 lg:sticky lg:top-28">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Booking Summary</p>
                  <h3 className="mt-2 text-xl font-black text-white">Your journey</h3>
                  <div className="mt-5 space-y-4 border-y border-white/10 py-5 text-sm">
                    <div className="flex items-start gap-3"><MapPin size={17} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" /><div className="min-w-0"><span className="block text-xs text-white/50">Pickup → Drop</span><span className="mt-1 block break-words font-semibold text-white">{pickupLocation || "Pickup location"} → {dropLocation || "Drop location"}</span></div></div>
                    <div className="flex items-start gap-3"><CalendarDays size={17} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" /><div><span className="block text-xs text-white/50">Travel date</span><span className="mt-1 block font-semibold text-white">{displayDate}</span></div></div>
                    <div className="flex items-start gap-3"><Clock3 size={17} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" /><div><span className="block text-xs text-white/50">Pickup time</span><span className="mt-1 block font-semibold text-white">{pickupTime || "Choose a time"}</span></div></div>
                    <div className="flex items-start gap-3"><UsersRound size={17} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" /><div><span className="block text-xs text-white/50">Passengers</span><span className="mt-1 block font-semibold text-white">{passengerCount || "Choose passenger count"}</span></div></div>
                    <div><span className="block text-xs text-white/50">Selected service</span><span className="mt-1 block font-semibold text-white">{selectedService}</span></div>
                    <div><span className="block text-xs text-white/50">Customer</span><span className="mt-1 block font-semibold text-white">{customerName || "Your name"}</span><span className="mt-1 block break-all text-xs text-white/60">{customerPhone || "Phone"} · {customerEmail || "Email"}</span></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white/70">Price</span>
                    <span className="text-sm font-bold text-white">Price to be confirmed</span>
                  </div>
                  {bookingStage === "review" && (
                    <>
                      <button type="button" onClick={handleConfirmBooking} disabled={submitting} className="mt-6 min-h-14 w-full rounded-xl bg-emerald-400 px-4 text-base font-black text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-70">
                        {paymentStatus === "initiating" ? "Creating booking..." : paymentStatus === "processing" ? "Opening secure payment..." : "Confirm Booking & Pay"}
                      </button>
                      {paymentError && (
                        <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm font-medium text-rose-200">
                          <p className="font-bold">Payment Failed</p>
                          <p className="mt-1">{paymentError}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentError(null);
                              setPaymentStatus("idle");
                            }}
                            className="mt-3 rounded-lg bg-rose-400/20 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-400/30"
                          >
                            Retry Payment
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </aside>
              </div>
            )}
          </div>
        </Container>
      </section>
    </div>
  );
}
