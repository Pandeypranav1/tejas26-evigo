"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import { RejectBookingModal } from "@/components/RejectBookingModal";

type FilterStatus = "all" | "pending" | "confirmed" | "completed" | "rejected" | "cancelled";

export default function ProviderDashboard() {
  const router = useRouter();
  const { user, role, loading, signOut } = useAuth();

  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [selectedRejectBooking, setSelectedRejectBooking] = useState<any | null>(null);
  const [togglingService, setTogglingService] = useState<string | null>(null);

  const loadData = useCallback(async (userId: string) => {
    try {
      setLoadingData(true);

      // 1. Fetch provider bookings
      const bookingsRes = await fetch(`/api/bookings?role=provider&user_id=${encodeURIComponent(userId)}&provider_id=faab-cab`);
      const bookingsData = await bookingsRes.json();
      if (bookingsData.success && Array.isArray(bookingsData.bookings)) {
        setBookings(bookingsData.bookings);
      }

      // 2. Fetch provider services
      const servicesRes = await fetch(`/api/services?user_id=${encodeURIComponent(userId)}`);
      const servicesData = await servicesRes.json();
      if (servicesData.success && Array.isArray(servicesData.services)) {
        setServices(servicesData.services);
      }
    } catch (err) {
      console.warn("[ProviderDashboard] Error loading data:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login/provider");
      return;
    }
    if (role !== "provider") {
      router.replace("/dashboard");
      return;
    }

    loadData(user.id);
  }, [loading, role, router, user, loadData]);

  const handleSignOut = () => {
    signOut();
    router.replace("/");
  };

  // ── Accept Booking Handler ──
  const handleAcceptBooking = async (booking: any) => {
    setActionInProgress(booking.id);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: booking.id,
          status: "confirmed",
          user_id: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to accept booking");
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? { ...b, status: "confirmed", provider_response_at: new Date().toISOString() }
            : b
        )
      );
    } catch (err: any) {
      alert(`Error accepting booking: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // ── Mark as Completed Handler ──
  const handleCompleteBooking = async (booking: any) => {
    setActionInProgress(booking.id);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: booking.id,
          status: "completed",
          user_id: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to complete booking");
      }

      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status: "completed" } : b))
      );
    } catch (err: any) {
      alert(`Error completing booking: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // ── Service Availability Toggle (Requirement 9) ──
  const handleToggleService = async (serviceId: string, currentStatus: boolean) => {
    setTogglingService(serviceId);
    const newStatus = !currentStatus;

    try {
      const res = await fetch("/api/services/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          is_available: newStatus,
          user_id: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update service availability");
      }

      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, is_available: newStatus } : s))
      );
    } catch (err: any) {
      alert(err.message || "Could not toggle service availability");
    } finally {
      setTogglingService(null);
    }
  };

  // ── Summary Metrics (Requirement 4) ──
  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => (b.status || "pending").toLowerCase() === "pending").length;
    const confirmed = bookings.filter(
      (b) => (b.status || "").toLowerCase() === "confirmed" || (b.status || "").toLowerCase() === "accepted"
    ).length;
    const completed = bookings.filter((b) => (b.status || "").toLowerCase() === "completed").length;
    const rejected = bookings.filter((b) => (b.status || "").toLowerCase() === "rejected").length;
    const cancelled = bookings.filter((b) => (b.status || "").toLowerCase() === "cancelled").length;

    return { total, pending, confirmed, completed, rejected, cancelled };
  }, [bookings]);

  // ── Filtered Bookings ──
  const filteredBookings = useMemo(() => {
    if (activeFilter === "all") return bookings;
    if (activeFilter === "confirmed") {
      return bookings.filter(
        (b) => (b.status || "").toLowerCase() === "confirmed" || (b.status || "").toLowerCase() === "accepted"
      );
    }
    return bookings.filter((b) => (b.status || "pending").toLowerCase() === activeFilter);
  }, [bookings, activeFilter]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05030f] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs font-bold tracking-wider text-white/50 uppercase">
            Loading Provider Dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 py-10 bg-zinc-50 min-h-[90vh]">
      <Container>
        {/* Header Hero Card */}
        <div className="relative rounded-3xl border border-zinc-200 bg-[#0f0a1e] text-white p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-violet-600/20 blur-[80px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-cyan-600/20 blur-[80px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 to-violet-600 p-0.5 shadow-lg shadow-cyan-500/30 shrink-0">
                <div className="w-full h-full rounded-2xl bg-[#140b2a] flex items-center justify-center text-2xl font-black text-white">
                  🚗
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 text-xs font-bold text-cyan-300 mb-2 backdrop-blur-md">
                  ✦ Verified Evigo Partner
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
                  Provider Management Console
                </h1>
                <p className="text-xs text-zinc-400">
                  Logged in as <strong className="text-zinc-200">{user.email}</strong> • Managing transport mobility & event bookings across Bihar.
                </p>
              </div>
            </div>

            {/* Notification Bell & Logout */}
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 border-t lg:border-t-0 border-white/10 pt-4 lg:pt-0">
              <NotificationBell userId={user.id} />

              <button
                onClick={() => loadData(user.id)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-colors"
                title="Refresh"
              >
                🔄
              </button>

              <Link href="/partner">
                <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold text-xs py-2.5 px-4 shadow-lg border-0">
                  + Add Listing
                </Button>
              </Link>

              <Button
                variant="secondary"
                onClick={handleSignOut}
                className="text-xs py-2.5 px-4 bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Metrics Cards (Requirement 4) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Bookings</div>
            <div className="text-3xl font-black text-zinc-900 mt-1">{stats.total}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Across all categories</div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending</div>
            <div className="text-3xl font-black text-amber-600 mt-1">{stats.pending}</div>
            <div className="text-[11px] text-amber-600/80 mt-1">Awaiting your response</div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Confirmed</div>
            <div className="text-3xl font-black text-emerald-600 mt-1">{stats.confirmed}</div>
            <div className="text-[11px] text-emerald-600/80 mt-1">Scheduled & active</div>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 shadow-sm">
            <div className="text-xs font-bold text-violet-700 uppercase tracking-wider">Completed</div>
            <div className="text-3xl font-black text-violet-600 mt-1">{stats.completed}</div>
            <div className="text-[11px] text-violet-600/80 mt-1">Fulfilled successfully</div>
          </div>
        </div>

        {/* Service Availability Section (Requirement 9) */}
        {services.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                  <span>⚙️</span> Service Catalog & Availability ({services.length})
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Toggle whether each transport or event service is currently online and accepting new bookings.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                        {svc.category || "Service"}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          svc.is_available
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${svc.is_available ? "bg-emerald-500" : "bg-zinc-400"}`} />
                        {svc.is_available ? "Accepting" : "Paused"}
                      </span>
                    </div>

                    <div className="text-sm font-black text-zinc-900 mb-1">
                      {svc.service_name}
                    </div>

                    <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                      {svc.description || "Standard mobility and event service offering."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500">
                      {svc.price ? `₹${svc.price}` : "Custom Rate"}
                    </span>

                    <button
                      onClick={() => handleToggleService(svc.id, svc.is_available)}
                      disabled={togglingService === svc.id}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                        svc.is_available
                          ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {togglingService === svc.id ? (
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : svc.is_available ? (
                        "Pause Service"
                      ) : (
                        "Enable Service"
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings Section (Requirement 4) */}
        <div className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                <span>📥</span> Incoming Customer Bookings ({filteredBookings.length})
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Review journey requests, verify customer requirements, and accept or decline.
              </p>
            </div>

            {/* Filter Tabs (Requirement 4) */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-zinc-200/70 border border-zinc-300/60 self-start sm:self-auto">
              {(
                [
                  { id: "all", label: "All", count: stats.total },
                  { id: "pending", label: "Pending", count: stats.pending },
                  { id: "confirmed", label: "Confirmed", count: stats.confirmed },
                  { id: "completed", label: "Completed", count: stats.completed },
                  { id: "rejected", label: "Rejected", count: stats.rejected },
                  { id: "cancelled", label: "Cancelled", count: stats.cancelled },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all ${
                    activeFilter === tab.id
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
                  }`}
                >
                  {tab.label} <span className="opacity-70 text-[10px]">({tab.count})</span>
                </button>
              ))}
            </div>
          </div>

          {loadingData ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto mb-3" />
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Loading bookings...
              </div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
              <div style={{ fontSize: 44 }} className="mb-3">📬</div>
              <div className="text-lg font-black text-zinc-800">
                No {activeFilter !== "all" ? activeFilter : ""} bookings found
              </div>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1">
                Customer bookings submitted through Evigo will display here in real time.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
              {filteredBookings.map((b) => {
                const currentStatus = (b.status || "pending").toLowerCase();
                const isPending = currentStatus === "pending";
                const isConfirmed = currentStatus === "confirmed" || currentStatus === "accepted";
                const isRejected = currentStatus === "rejected";
                const isCancelled = currentStatus === "cancelled";
                const isCompleted = currentStatus === "completed";

                const isTransport =
                  b.service_type === "Transport" ||
                  b.serviceType === "Transport" ||
                  !!b.pickup_location ||
                  !!b.pickupLocation;

                const customerName = b.customer_name || b.customerName || "Customer";
                const customerPhone = b.customer_phone || b.customerPhone || b.clientPhone;
                const customerEmail = b.customer_email || b.customerEmail;
                const serviceTitle = b.transport_service || b.transportService || b.service_type || b.serviceType || "Booking";
                const eventDate = b.travel_date || b.travelDate || b.event_date || b.eventDate || "Date TBD";
                const eventTime = b.pickup_time || b.pickupTime || b.event_time || b.eventTime || "Flexible";
                const pickup = b.pickup_location || b.pickupLocation;
                const drop = b.drop_location || b.dropLocation;
                const passengers = b.passenger_count || b.passengerCount || b.guest_count || b.guestCount;
                const specialRequest = b.message || b.notes;

                return (
                  <div
                    key={b.id}
                    className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar: Status Badge + Date */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="px-2.5 py-0.5 text-[11px] font-black rounded-full uppercase border"
                          style={{
                            backgroundColor:
                              isCompleted ? "rgba(16,185,129,0.1)" :
                              isConfirmed ? "rgba(6,182,212,0.1)" :
                              isRejected ? "rgba(239,68,68,0.1)" :
                              isCancelled ? "rgba(156,163,175,0.1)" : "rgba(245,158,11,0.1)",
                            borderColor:
                              isCompleted ? "rgba(16,185,129,0.3)" :
                              isConfirmed ? "rgba(6,182,212,0.3)" :
                              isRejected ? "rgba(239,68,68,0.3)" :
                              isCancelled ? "rgba(156,163,175,0.3)" : "rgba(245,158,11,0.3)",
                            color:
                              isCompleted ? "#059669" :
                              isConfirmed ? "#0891b2" :
                              isRejected ? "#dc2626" :
                              isCancelled ? "#6b7280" : "#d97706",
                          }}
                        >
                          {currentStatus}
                        </span>

                        <span className="text-[11px] font-mono text-zinc-400">
                          ID: #{b.id.slice(-8)}
                        </span>
                      </div>

                      {/* Customer Name & Service */}
                      <div className="mb-3">
                        <h3 className="text-base font-black text-zinc-900">
                          {customerName}
                        </h3>
                        <div className="text-xs font-bold text-violet-700 mt-0.5">
                          {serviceTitle}
                        </div>
                      </div>

                      {/* Contact & Date/Time Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 mb-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60 font-medium">
                        {customerPhone && (
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase font-bold block">Phone</span>
                            <span className="text-zinc-800 font-semibold">📞 {customerPhone}</span>
                          </div>
                        )}
                        {customerEmail && (
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase font-bold block">Email</span>
                            <span className="text-zinc-800 font-semibold truncate block" title={customerEmail}>
                              ✉️ {customerEmail}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Date</span>
                          <span className="text-zinc-800 font-semibold">📅 {eventDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Time</span>
                          <span className="text-zinc-800 font-semibold">⏰ {eventTime}</span>
                        </div>
                      </div>

                      {/* Transport Specific Route & Passengers */}
                      {isTransport && (pickup || drop || passengers) && (
                        <div className="mb-3 p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-xs space-y-1.5">
                          {pickup && (
                            <div className="text-zinc-700">
                              <span className="text-emerald-600 font-bold">📍 Pickup:</span>{" "}
                              <span className="font-semibold text-zinc-900">{pickup}</span>
                            </div>
                          )}
                          {drop && (
                            <div className="text-zinc-700">
                              <span className="text-red-500 font-bold">🏁 Destination:</span>{" "}
                              <span className="font-semibold text-zinc-900">{drop}</span>
                            </div>
                          )}
                          {passengers && (
                            <div className="text-zinc-700">
                              <span className="font-bold">👥 Passenger count:</span>{" "}
                              <span className="font-semibold text-zinc-900">{passengers}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Special Request */}
                      {specialRequest && (
                        <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-900 italic font-medium">
                          💬 Special Request: "{specialRequest}"
                        </div>
                      )}

                      {/* Rejection Reason Display */}
                      {isRejected && b.rejection_reason && (
                        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                          <strong>Rejection reason:</strong> "{b.rejection_reason}"
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Accept / Reject / Complete (Requirement 4) */}
                    <div className="pt-4 border-t border-zinc-100 mt-2">
                      {isPending ? (
                        <div className="flex gap-2">
                          <button
                            id={`accept-btn-${b.id}`}
                            onClick={() => handleAcceptBooking(b)}
                            disabled={actionInProgress === b.id}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            {actionInProgress === b.id ? "Accepting..." : "✓ Accept Booking"}
                          </button>

                          <button
                            id={`reject-btn-${b.id}`}
                            onClick={() => setSelectedRejectBooking(b)}
                            disabled={actionInProgress === b.id}
                            className="flex-1 py-2 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs transition-colors disabled:opacity-50"
                          >
                            ✕ Reject Booking
                          </button>
                        </div>
                      ) : isConfirmed ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <span>✅</span> Confirmed
                          </span>
                          <button
                            onClick={() => handleCompleteBooking(b)}
                            disabled={actionInProgress === b.id}
                            className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-sm transition-all"
                          >
                            {actionInProgress === b.id ? "Saving..." : "Mark Completed ✓"}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-xs font-semibold text-zinc-400 py-1">
                          {isCompleted
                            ? "🎉 Journey Completed"
                            : isCancelled
                            ? "🚫 Cancelled by Customer"
                            : "Declined"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Container>

      {/* Reject Booking Reason Modal */}
      <RejectBookingModal
        isOpen={!!selectedRejectBooking}
        booking={selectedRejectBooking}
        onClose={() => setSelectedRejectBooking(null)}
        onRejected={(updated) => {
          setBookings((prev) =>
            prev.map((b) => (b.id === updated.id ? updated : b))
          );
        }}
      />
    </main>
  );
}
