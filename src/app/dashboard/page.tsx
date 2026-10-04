"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import { EditProfileModal } from "@/components/EditProfileModal";
import { BookingDetailsModal } from "@/components/BookingDetailsModal";
import PaymentCheckout from "@/components/PaymentCheckout";
import { createClient } from "@/lib/client";

type ClientProfile = {
  id?: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  avatar_url?: string | null;
};

type BookingStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "completed"
  | "cancelled"
  | "accepted";

const normalizeStatus = (status?: string): BookingStatus | string => {
  const normalized = (status || "pending").toLowerCase();
  if (normalized === "accepted") return "confirmed";
  return normalized as BookingStatus | string;
};

const isEligibleForCancellation = (status?: string) => {
  const normalized = normalizeStatus(status);
  return normalized === "pending" || normalized === "confirmed";
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const normalizeBooking = (raw: Record<string, any>, fallbackEmail?: string) => {
  const statusValue = normalizeStatus(raw.status);
  const providerName =
    raw.provider_name ||
    raw.providerName ||
    (raw.provider_id === "faab-cab" || raw.provider_uuid ? "FaabCab" : "Service Provider");
  const service =
    raw.transport_service ||
    raw.transportService ||
    raw.service_type ||
    raw.serviceType ||
    "Transport";

  return {
    ...raw,
    id: String(raw.id),
    provider_name: providerName,
    providerName,
    service_type: raw.service_type || raw.serviceType || service,
    transport_service: raw.transport_service || raw.transportService || service,
    status: statusValue,
    customer_name: raw.customer_name || raw.customerName || "Customer",
    customer_phone: raw.customer_phone || raw.customerPhone || "",
    customer_email: raw.customer_email || raw.customerEmail || fallbackEmail || "",
    created_at: raw.created_at || raw.createdAt || new Date().toISOString(),
    travel_date: raw.travel_date || raw.event_date || raw.travelDate || raw.eventDate || "Not specified",
    pickup_time: raw.pickup_time || raw.pickupTime || raw.event_time || raw.eventTime || "Flexible",
    pickup_location: raw.pickup_location || raw.pickupLocation,
    drop_location: raw.drop_location || raw.dropLocation,
    passenger_count: raw.passenger_count ?? raw.passengerCount ?? raw.guest_count ?? raw.guestCount ?? null,
    message: raw.message || raw.notes || raw.special_request || raw.specialRequest || "",
    ...raw,
  };
};

export default function ClientDashboard() {
  const router = useRouter();
  const { user, role, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [bookings, setBookings] = useState<Record<string, any>[]>([]);
  const [comboBookings, setComboBookings] = useState<Record<string, any>[]>([]);
  const [payments, setPayments] = useState<Record<string, any>[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "services" | "combos" | "payments">("all");
  const [selectedBooking, setSelectedBooking] = useState<Record<string, any> | null>(null);
  const [selectedComboBooking, setSelectedComboBooking] = useState<Record<string, any> | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Record<string, any> | null>(null);
  const [cancelComboTarget, setCancelComboTarget] = useState<Record<string, any> | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [paymentCheckout, setPaymentCheckout] = useState<{
    isOpen: boolean;
    bookingId?: string;
    comboBookingId?: string;
    bookingName?: string;
    amount?: number;
  }>({ isOpen: false });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login/client");
      return;
    }
    if (role !== "client") {
      router.replace("/provider/dashboard");
      return;
    }

    const loadProfile = async () => {
      const profileResponse = await fetch(`/api/profile?user_id=${encodeURIComponent(user.id)}`);
      const profileData = await profileResponse.json();
      if (profileResponse.ok && profileData.success && profileData.profile) {
        setProfile(profileData.profile);
      } else {
        setProfile({
          id: user.id,
          full_name: null,
          email: user.email,
          phone: null,
          city: "Jamui, Bihar",
          avatar_url: null,
        });
      }
    };

    const loadBookings = async () => {
      try {
        const params = new URLSearchParams({ client_id: user.id });
        const primaryRes = await fetch(`/api/bookings?${params.toString()}`);
        const primaryData = await primaryRes.json();

        let nextBookings: Record<string, any>[] = [];

        if (primaryRes.ok && primaryData.success && Array.isArray(primaryData.bookings)) {
          nextBookings = primaryData.bookings.map((booking: Record<string, any>) =>
            normalizeBooking(booking, user.email)
          );
        }

        if (!nextBookings.length && user.email) {
          const fallbackRes = await fetch(`/api/bookings?email=${encodeURIComponent(user.email)}`);
          const fallbackData = await fallbackRes.json();
          if (fallbackRes.ok && fallbackData.success && Array.isArray(fallbackData.bookings)) {
            nextBookings = fallbackData.bookings.map((booking: Record<string, any>) =>
              normalizeBooking(booking, user.email)
            );
          }
        }

        setBookings(nextBookings);
      } catch (error) {
        console.warn("[ClientDashboard] Failed to load bookings:", error);
        setBookings([]);
      }
    };

    const loadComboBookings = async () => {
      try {
        const res = await fetch("/api/combo-packs/bookings");
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.bookings)) {
          setComboBookings(data.bookings);
        }
      } catch (error) {
        console.warn("[ClientDashboard] Failed to load combo bookings:", error);
        setComboBookings([]);
      }
    };

    const loadPayments = async () => {
      try {
        const res = await fetch(`/api/payments?user_id=${encodeURIComponent(user.id)}`);
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.payments)) {
          setPayments(data.payments);
        }
      } catch (error) {
        console.warn("[ClientDashboard] Failed to load payments:", error);
        setPayments([]);
      }
    };

    loadProfile();
    loadBookings();
    loadComboBookings();
    loadPayments();

    // Set up Supabase realtime subscription for payments
    if (user) {
      const supabase = createClient();
      const paymentsSubscription = supabase
        .channel('payments-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[ClientDashboard] Payment change detected:', payload);
            loadPayments();
            // Also reload bookings/combo bookings as payment_status may have changed
            loadBookings();
            loadComboBookings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(paymentsSubscription);
      };
    }
  }, [loading, role, router, user]);

  const handleSignOut = () => {
    signOut();
    router.replace("/");
  };

  const handleProfileUpdated = (updatedProfile: ClientProfile) => {
    setProfile((prev) => ({ ...prev, ...updatedProfile }));
  };

  const handleBookingUpdated = (updatedBooking: Record<string, any>) => {
    setBookings((prev) =>
      prev.map((booking) => (booking.id === updatedBooking.id ? normalizeBooking(updatedBooking, user?.email) : booking))
    );
    setSelectedBooking((prev) =>
      prev && prev.id === updatedBooking.id ? normalizeBooking(updatedBooking, user?.email) : prev
    );
  };

  const handleCancelBooking = async () => {
    if (!cancelTarget) return;
    setCanceling(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cancelTarget.id, action: "cancel" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel booking");
      }

      const updatedBooking = normalizeBooking(data.booking || { ...cancelTarget, status: "cancelled" }, user?.email);
      setBookings((prev) => prev.map((booking) => (booking.id === updatedBooking.id ? updatedBooking : booking)));
      setSelectedBooking((prev) => (prev && prev.id === updatedBooking.id ? updatedBooking : prev));
      setCancelTarget(null);
    } catch (error: any) {
      console.error("[ClientDashboard] Cancel booking error:", error);
      alert(error.message || "Failed to cancel booking");
    } finally {
      setCanceling(false);
    }
  };

  const handleCancelComboBooking = async () => {
    if (!cancelComboTarget) return;
    setCanceling(true);

    try {
      const res = await fetch("/api/combo-packs/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: cancelComboTarget.id, action: "cancel" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel combo booking");
      }

      setComboBookings((prev) =>
        prev.map((cb) => (cb.id === cancelComboTarget.id ? { ...cb, status: "cancelled" } : cb))
      );
      setCancelComboTarget(null);
    } catch (error: any) {
      console.error("[ClientDashboard] Cancel combo booking error:", error);
      alert(error.message || "Failed to cancel combo booking");
    } finally {
      setCanceling(false);
    }
  };

  const handlePayNow = (booking: Record<string, any>) => {
    setPaymentCheckout({
      isOpen: true,
      bookingId: booking.id,
      bookingName: `${booking.provider_name} - ${booking.service_type || booking.transport_service}`,
      amount: 500, // Default amount - server will provide authoritative amount
    });
  };

  const handleComboPayNow = (comboBooking: Record<string, any>) => {
    setPaymentCheckout({
      isOpen: true,
      comboBookingId: comboBooking.id,
      bookingName: comboBooking.combo_name || "Combo Package",
      amount: Number(comboBooking.total_amount || 0),
    });
  };

  const profileDisplayName = profile?.full_name || user?.email?.split("@")?.[0] || "Client";
  const profileCity = profile?.city || "Jamui, Bihar";
  const profilePhone = profile?.phone || "Not set";
  const profileInitial = (profile?.full_name || profile?.email || user?.email || "C").charAt(0).toUpperCase();

  const statusStyles: Record<string, string> = useMemo(
    () => ({
      pending: "bg-amber-100 text-amber-700 border border-amber-200",
      confirmed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      rejected: "bg-red-100 text-red-700 border border-red-200",
      completed: "bg-violet-100 text-violet-700 border border-violet-200",
      cancelled: "bg-slate-200 text-slate-700 border border-slate-300",
    }),
    []
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05030f] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs font-bold tracking-wider text-white/50 uppercase">
            Loading Client Dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 py-10 bg-zinc-50 min-h-[90vh]">
      <Container>
        <div className="space-y-6">
          <header className="relative overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="relative shrink-0">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg shadow-cyan-500/20 sm:h-24 sm:w-24">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Profile avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-2xl font-black text-white sm:text-3xl">{profileInitial}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">
                      Client Dashboard
                    </div>
                    <h1 className="mt-3 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">
                      {profileDisplayName}
                    </h1>

                    <div className="mt-3 grid gap-2 text-xs font-semibold text-zinc-600 sm:grid-cols-2">
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Name</div>
                        <div className="mt-1 text-sm font-bold text-zinc-900">{profileDisplayName}</div>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Email</div>
                        <div className="mt-1 text-sm font-bold text-zinc-900 break-all">{profile?.email || user.email}</div>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Phone</div>
                        <div className="mt-1 text-sm font-bold text-zinc-900">{profilePhone}</div>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">City</div>
                        <div className="mt-1 text-sm font-bold text-zinc-900">{profileCity}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start xl:justify-end">
                  <NotificationBell userId={user.id} variant="light" />
                  <Button
                    variant="secondary"
                    className="text-xs font-bold"
                    onClick={() => setIsProfileModalOpen(true)}
                  >
                    Edit Profile
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link href="/combo-packs" className="w-full sm:w-auto">
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20">
                    🎁 Browse Combo Packs
                  </Button>
                </Link>
                <Link href="/travel-tourism/faabcab" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full text-xs font-bold">
                    Book Transport
                  </Button>
                </Link>
                <Link href="/explore" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full text-xs font-bold">
                    Explore Events
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  onClick={handleSignOut}
                  className="w-full sm:w-auto text-xs font-bold hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </header>

          {/* Navigation Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all border ${
                activeTab === "all"
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              All Requests ({bookings.length + comboBookings.length})
            </button>
            <button
              onClick={() => setActiveTab("combos")}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all border flex items-center gap-1.5 ${
                activeTab === "combos"
                  ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white border-transparent shadow-md"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <span>🎁</span>
              <span>Combo Packages ({comboBookings.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all border ${
                activeTab === "services"
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              Single Services & Cabs ({bookings.length})
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all border flex items-center gap-1.5 ${
                activeTab === "payments"
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-600 text-white border-transparent shadow-md"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <span>💳</span>
              <span>My Payments ({payments.length})</span>
            </button>
          </div>

          {/* Combo Packages Section */}
          {(activeTab === "all" || activeTab === "combos") && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                  <span>🎁</span>
                  <span>Your Combo Packages ({comboBookings.length})</span>
                </h2>
                <Link href="/combo-packs" className="text-xs font-bold text-cyan-600 hover:text-cyan-700">
                  + Book Another Combo
                </Link>
              </div>

              {comboBookings.length === 0 ? (
                activeTab === "combos" && (
                  <div className="rounded-[28px] border-2 border-dashed border-zinc-200 bg-white p-10 text-center shadow-sm">
                    <div className="mb-4 text-5xl">🎁</div>
                    <div className="text-xl font-black text-zinc-900">No combo bookings yet</div>
                    <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-zinc-500">
                      Bundle cab transport, verified hotel stays, and guides for maximum savings.
                    </p>
                    <div className="mt-6 flex justify-center">
                      <Link href="/combo-packs">
                        <Button className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-xs">
                          Explore Combo Packs
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {comboBookings.map((cb) => {
                    const status = (cb.status || "pending").toLowerCase();
                    const isCancelable = ["pending", "partially_confirmed", "confirmed"].includes(status);

                    return (
                      <article
                        key={cb.id}
                        className="rounded-[24px] border border-cyan-200/70 bg-gradient-to-br from-white via-cyan-50/20 to-violet-50/20 p-5 shadow-sm transition-all hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-700 border border-cyan-500/20 mb-1">
                                  <span>🎁</span> Multi-Service Combo
                                </div>
                                <div className="text-xl font-black text-zinc-900">
                                  {cb.combo_name || "Evigo Combo Package"}
                                </div>
                              </div>
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                                  status === "confirmed"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : status === "partially_confirmed"
                                    ? "bg-cyan-100 text-cyan-800 border border-cyan-300"
                                    : status === "completed"
                                    ? "bg-violet-100 text-violet-800 border border-violet-300"
                                    : status === "rejected" || status === "action_required"
                                    ? "bg-red-100 text-red-800 border border-red-300"
                                    : status === "cancelled"
                                    ? "bg-slate-200 text-slate-700 border border-slate-300"
                                    : "bg-amber-100 text-amber-800 border border-amber-300"
                                }`}
                              >
                                {status.replace("_", " ")}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-2 text-xs font-semibold text-zinc-600 sm:grid-cols-2 xl:grid-cols-4">
                              <div className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-2">
                                <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Combo ID</span>
                                <span className="mt-1 block font-mono text-zinc-900">#{String(cb.id).slice(-8).toUpperCase()}</span>
                              </div>
                              <div className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-2">
                                <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Travel Date</span>
                                <span className="mt-1 block text-zinc-900">{formatDate(cb.start_date || cb.booking_date)}</span>
                              </div>
                              <div className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-2">
                                <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Guests</span>
                                <span className="mt-1 block text-zinc-900">{cb.guest_count || 1} Person(s)</span>
                              </div>
                              <div className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-2">
                                <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Total Price</span>
                                <span className="mt-1 block font-bold text-emerald-700">₹{Number(cb.total_amount || 0).toLocaleString("en-IN")}</span>
                              </div>
                            </div>

                            {/* Included Services Itemized Realtime Status */}
                            <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-white/90 p-4">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                                Included Services & Live Provider Responses:
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {cb.items && cb.items.length > 0 ? (
                                  cb.items.map((item: any, idx: number) => {
                                    const itemStatus = (item.provider_booking_status || "pending").toLowerCase();
                                    return (
                                      <div
                                        key={item.id || idx}
                                        className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/80 p-2.5 text-xs"
                                      >
                                        <div>
                                          <div className="font-bold text-zinc-900">{item.service_type}</div>
                                          <div className="text-[11px] text-zinc-500">{item.provider_name || "Provider"}</div>
                                        </div>
                                        <span
                                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                            itemStatus === "confirmed"
                                              ? "bg-emerald-100 text-emerald-700"
                                              : itemStatus === "rejected"
                                              ? "bg-red-100 text-red-700"
                                              : itemStatus === "completed"
                                              ? "bg-violet-100 text-violet-700"
                                              : itemStatus === "cancelled"
                                              ? "bg-slate-200 text-slate-700"
                                              : "bg-amber-100 text-amber-700"
                                          }`}
                                        >
                                          {itemStatus}
                                        </span>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="text-xs text-zinc-400">Services linked to booking.</div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex min-w-[140px] flex-col gap-2 xl:items-end justify-between self-stretch">
                            {/* Payment Status Display */}
                            <div className="flex flex-col gap-1 xl:items-end">
                              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Payment</span>
                              {cb.payment_status === 'paid' ? (
                                <span className="text-[11px] font-bold text-green-600">PAID</span>
                              ) : cb.payment_status === 'failed' ? (
                                <span className="text-[11px] font-bold text-red-600">FAILED</span>
                              ) : cb.payment_status === 'refunded' ? (
                                <span className="text-[11px] font-bold text-amber-600">REFUNDED</span>
                              ) : (
                                <span className="text-[11px] font-bold text-amber-500">PENDING</span>
                              )}
                            </div>

                            {/* Retry Payment Button - only for failed payments */}
                            {cb.payment_status === 'failed' && (
                              <button
                                type="button"
                                onClick={() => handleComboPayNow(cb)}
                                className="w-full xl:w-auto rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-3.5 py-2 text-[11px] font-bold text-white transition hover:opacity-90"
                              >
                                Retry Payment
                              </button>
                            )}

                            {isCancelable && (
                              <button
                                type="button"
                                onClick={() => setCancelComboTarget(cb)}
                                className="w-full xl:w-auto rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-[11px] font-bold text-red-600 transition hover:bg-red-100 mt-auto"
                              >
                                Cancel Package
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Single Service Bookings Section */}
          {(activeTab === "all" || activeTab === "services") && (
            <section className="space-y-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-zinc-900">
                  <span className="mr-2">📋</span>
                  Single Service & Transport Requests ({bookings.length})
                </h2>
              </div>

            {bookings.length === 0 ? (
              <div className="rounded-[28px] border-2 border-dashed border-zinc-200 bg-white p-10 text-center shadow-sm">
                <div className="mb-4 text-5xl">🚗</div>
                <div className="text-xl font-black text-zinc-900">No bookings yet</div>
                <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-zinc-500">
                  Explore services or book transport to get started.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/explore">
                    <Button variant="secondary" className="w-full text-xs font-bold sm:w-auto">
                      Explore Services
                    </Button>
                  </Link>
                  <Link href="/travel-tourism/faabcab">
                    <Button className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-xs sm:w-auto">
                      Book Transport
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const status = normalizeStatus(booking.status);
                  const isTransportBooking =
                    booking.service_type === "Transport" ||
                    booking.transport_service ||
                    booking.pickup_location ||
                    booking.drop_location ||
                    booking.pickupLocation ||
                    booking.dropLocation;

                  return (
                    <article
                      key={booking.id}
                      className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-lg font-black text-zinc-900">
                                {booking.provider_name || booking.providerName || "Service Provider"}
                              </div>
                              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                                {booking.transport_service || booking.service_type || "Booking"}
                              </div>
                            </div>
                            <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusStyles[status] || "bg-zinc-100 text-zinc-700 border border-zinc-200"}`}>
                              {status === "cancelled" ? "Cancelled" : status === "completed" ? "Completed" : status === "rejected" ? "Rejected" : status === "confirmed" ? "Confirmed" : status === "pending" ? "Pending" : "Pending"}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-2 text-xs font-semibold text-zinc-600 sm:grid-cols-2 xl:grid-cols-3">
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Booking ID</span>
                              <span className="mt-1 block font-mono text-zinc-900">#{String(booking.id).slice(-8)}</span>
                            </div>
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Date</span>
                              <span className="mt-1 block text-zinc-900">{formatDate(booking.travel_date || booking.event_date)}</span>
                            </div>
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Time</span>
                              <span className="mt-1 block text-zinc-900">{booking.pickup_time || booking.event_time || "Flexible"}</span>
                            </div>
                          </div>

                          {isTransportBooking && (
                            <div className="mt-4 grid gap-2 text-xs font-semibold text-zinc-600 sm:grid-cols-2">
                              {booking.pickup_location || booking.pickupLocation ? (
                                <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 px-3 py-2">
                                  <span className="block text-[10px] uppercase tracking-[0.18em] text-cyan-700">Pickup</span>
                                  <span className="mt-1 block text-zinc-900">{booking.pickup_location || booking.pickupLocation}</span>
                                </div>
                              ) : null}
                              {booking.drop_location || booking.dropLocation ? (
                                <div className="rounded-xl border border-violet-200 bg-violet-50/40 px-3 py-2">
                                  <span className="block text-[10px] uppercase tracking-[0.18em] text-violet-700">Destination</span>
                                  <span className="mt-1 block text-zinc-900">{booking.drop_location || booking.dropLocation}</span>
                                </div>
                              ) : null}
                              {booking.passenger_count || booking.passengerCount ? (
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                                  <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Passengers</span>
                                  <span className="mt-1 block text-zinc-900">{booking.passenger_count || booking.passengerCount}</span>
                                </div>
                              ) : null}
                              {booking.message || booking.notes ? (
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 sm:col-span-2">
                                  <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Special Request</span>
                                  <span className="mt-1 block text-zinc-900">{booking.message || booking.notes}</span>
                                </div>
                              ) : null}
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                            {[
                              "Request Sent",
                              "Waiting for Provider",
                              "Confirmed / Rejected",
                              "Completed",
                            ].map((step, index) => {
                              const active =
                                (index === 0 && true) ||
                                (index === 1 && (status === "pending" || status === "confirmed" || status === "rejected" || status === "completed")) ||
                                (index === 2 && (status === "confirmed" || status === "rejected" || status === "completed")) ||
                                (index === 3 && status === "completed");

                              return (
                                <span
                                  key={step}
                                  className={`rounded-full border px-2.5 py-1 ${active
                                    ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                                    : "border-zinc-200 bg-zinc-50 text-zinc-400"
                                    }`}
                                >
                                  {step}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex min-w-[180px] flex-col gap-2 xl:items-end">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Status</div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusStyles[status] || "bg-zinc-100 text-zinc-700 border border-zinc-200"}`}>
                            {status === "cancelled" ? "Cancelled" : status === "completed" ? "Completed" : status === "rejected" ? "Rejected" : status === "confirmed" ? "Confirmed" : status === "pending" ? "Pending" : "Pending"}
                          </span>

                          <div className="mt-2 flex w-full flex-col gap-2 xl:w-auto">
                            <button
                              type="button"
                              onClick={() => setSelectedBooking(booking)}
                              className="rounded-xl bg-zinc-900 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-zinc-800"
                            >
                              View Details
                            </button>

                            {/* Payment Status Display */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Payment</span>
                              {booking.payment_status === 'paid' ? (
                                <span className="text-[11px] font-bold text-green-600">PAID</span>
                              ) : booking.payment_status === 'failed' ? (
                                <span className="text-[11px] font-bold text-red-600">FAILED</span>
                              ) : booking.payment_status === 'refunded' ? (
                                <span className="text-[11px] font-bold text-amber-600">REFUNDED</span>
                              ) : (
                                <span className="text-[11px] font-bold text-amber-500">PENDING</span>
                              )}
                            </div>

                            {/* Retry Payment Button - only for failed payments */}
                            {booking.payment_status === 'failed' && (
                              <button
                                type="button"
                                onClick={() => handlePayNow(booking)}
                                className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-3 py-2 text-[11px] font-bold text-white transition hover:opacity-90"
                              >
                                Retry Payment
                              </button>
                            )}

                            {isEligibleForCancellation(status) && (
                              <button
                                type="button"
                                onClick={() => setCancelTarget(booking)}
                                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600 transition hover:bg-red-100"
                              >
                                Cancel Booking
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          )}

          {/* My Payments Section */}
          {activeTab === "payments" && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                  <span>💳</span>
                  <span>My Payments ({payments.length})</span>
                </h2>
              </div>

              {payments.length === 0 ? (
                <div className="rounded-[28px] border-2 border-dashed border-zinc-200 bg-white p-10 text-center shadow-sm">
                  <div className="mb-4 text-5xl">💳</div>
                  <div className="text-xl font-black text-zinc-900">No payments yet</div>
                  <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-zinc-500">
                    Your payment history will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => {
                    const status = (payment.status || "pending").toLowerCase();
                    const statusStyles: Record<string, string> = {
                      success: "bg-emerald-100 text-emerald-700 border border-emerald-300",
                      failed: "bg-red-100 text-red-700 border border-red-300",
                      pending: "bg-amber-100 text-amber-700 border border-amber-300",
                      processing: "bg-blue-100 text-blue-700 border border-blue-300",
                      refunded: "bg-violet-100 text-violet-700 border border-violet-300",
                    };

                    return (
                      <article
                        key={payment.id}
                        className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-5"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="text-lg font-black text-zinc-900">
                                  {payment.booking_id ? "Transport Booking" : payment.combo_booking_id ? "Combo Package" : "Payment"}
                                </div>
                                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                                  {payment.booking_id ? `Booking #${String(payment.booking_id).slice(-8)}` : payment.combo_booking_id ? `Combo #${String(payment.combo_booking_id).slice(-8)}` : ""}
                                </div>
                              </div>
                              <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusStyles[status] || "bg-zinc-100 text-zinc-700 border border-zinc-200"}`}>
                                {status.replace("_", " ")}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-2 text-xs font-semibold text-zinc-600 sm:grid-cols-2 xl:grid-cols-4">
                              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                                <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Payment ID</span>
                                <span className="mt-1 block font-mono text-zinc-900">#{String(payment.id).slice(-8).toUpperCase()}</span>
                              </div>
                              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                                <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Amount</span>
                                <span className="mt-1 block font-bold text-emerald-700">₹{Number(payment.amount || 0).toLocaleString("en-IN")}</span>
                              </div>
                              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                                <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Date</span>
                                <span className="mt-1 block text-zinc-900">{formatDate(payment.created_at)}</span>
                              </div>
                              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                                <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Gateway</span>
                                <span className="mt-1 block text-zinc-900 capitalize">{payment.selected_gateway || "N/A"}</span>
                              </div>
                            </div>

                            {payment.payment_method && (
                              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                                <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-400">Payment Method</span>
                                <span className="mt-1 block text-zinc-900 capitalize">{payment.payment_method}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex min-w-[140px] flex-col gap-2 xl:items-end">
                            <Link href={`/payment/${status === 'success' ? 'success' : 'failed'}?payment_id=${payment.id}`} className="w-full xl:w-auto">
                              <Button variant="secondary" className="w-full text-xs font-bold">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </Container>

      {profile && user && (
        <EditProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          userId={user.id}
          initialProfile={profile}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          isOpen={Boolean(selectedBooking)}
          onClose={() => setSelectedBooking(null)}
          onBookingUpdated={handleBookingUpdated}
        />
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[24px] border border-red-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 text-3xl">⚠️</div>
            <h3 className="text-xl font-black text-zinc-900">Cancel this booking?</h3>
            <p className="mt-2 text-sm font-medium text-zinc-600">
              This will update the booking status to cancelled and notify the provider.
            </p>

            <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-semibold text-zinc-700">
              <div>Provider: {cancelTarget.provider_name || "Service Provider"}</div>
              <div className="mt-1">Service: {cancelTarget.transport_service || cancelTarget.service_type || "Booking"}</div>
              <div className="mt-1">Booking ID: #{String(cancelTarget.id).slice(-8)}</div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={canceling}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {canceling ? "Cancelling..." : "Yes, Cancel Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelComboTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[24px] border border-red-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 text-3xl">⚠️</div>
            <h3 className="text-xl font-black text-zinc-900">Cancel this Combo Package?</h3>
            <p className="mt-2 text-sm font-medium text-zinc-600">
              This will cancel the entire package and notify all assigned service providers.
            </p>

            <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs font-semibold text-zinc-700 space-y-1">
              <div className="font-bold text-zinc-900">Package: {cancelComboTarget.combo_name || "Evigo Combo Package"}</div>
              <div>Booking ID: #{String(cancelComboTarget.id).slice(-8).toUpperCase()}</div>
              <div>Total Price: ₹{Number(cancelComboTarget.total_amount || 0).toLocaleString("en-IN")}</div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelComboTarget(null)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelComboBooking}
                disabled={canceling}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {canceling ? "Cancelling..." : "Yes, Cancel Package"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentCheckout
        isOpen={paymentCheckout.isOpen}
        onClose={() => setPaymentCheckout({ isOpen: false })}
        bookingId={paymentCheckout.bookingId}
        comboBookingId={paymentCheckout.comboBookingId}
        bookingName={paymentCheckout.bookingName}
        amount={paymentCheckout.amount}
      />
    </main>
  );
}
