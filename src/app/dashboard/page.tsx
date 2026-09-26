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
  const [selectedBooking, setSelectedBooking] = useState<Record<string, any> | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Record<string, any> | null>(null);
  const [canceling, setCanceling] = useState(false);

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

    loadProfile();
    loadBookings();
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
                  <NotificationBell userId={user.id} />
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
                <Link href="/travel-tourism/faabcab" className="w-full sm:w-auto">
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20">
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

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-zinc-900">
                <span className="mr-2">📋</span>
                Your Bookings & Transport Requests ({bookings.length})
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
    </main>
  );
}
