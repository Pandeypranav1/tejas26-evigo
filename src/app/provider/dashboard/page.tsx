"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { NotificationBell, type NotificationItem } from "@/components/NotificationBell";
import { RejectBookingModal } from "@/components/RejectBookingModal";
import { TransportRoutePanel } from "@/components/TransportRoutePanel";

type FilterStatus = "all" | "pending" | "confirmed" | "completed" | "rejected" | "cancelled";

export default function ProviderDashboard() {
  const router = useRouter();
  const { user, role, loading, signOut } = useAuth();

  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [providerRecord, setProviderRecord] = useState<any | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [selectedRejectBooking, setSelectedRejectBooking] = useState<any | null>(null);
  const [togglingService, setTogglingService] = useState<string | null>(null);
  const [expandedRouteBookingId, setExpandedRouteBookingId] = useState<string | null>(null);
  const [newBookingNotice, setNewBookingNotice] = useState<NotificationItem | null>(null);
  const bookingCardRefs = useRef(new Map<string, HTMLDivElement>());

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editExperienceYears, setEditExperienceYears] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editServiceAreas, setEditServiceAreas] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async (userId: string, showLoading = true) => {
    try {
      if (showLoading) setLoadingData(true);

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

      // 3. Fetch user profile
      const profileRes = await fetch(`/api/profile?user_id=${encodeURIComponent(userId)}`);
      const profileData = await profileRes.json();
      if (profileData.success && profileData.profile) {
        setProfile(profileData.profile);
      }

      // 4. Fetch provider record
      const providerRes = await fetch(`/api/providers?user_id=${encodeURIComponent(userId)}`);
      const providerData = await providerRes.json();
      if (providerData.success && Array.isArray(providerData.providers) && providerData.providers.length > 0) {
        setProviderRecord(providerData.providers[0]);
      }
    } catch (err) {
      console.warn("[ProviderDashboard] Error loading data:", err);
    } finally {
      if (showLoading) setLoadingData(false);
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

  const handleRealtimeBooking = useCallback((notification: NotificationItem) => {
    setNewBookingNotice(notification);
    if (user?.id) void loadData(user.id, false);
  }, [loadData, user?.id]);

  useEffect(() => {
    if (!expandedRouteBookingId) return;
    bookingCardRefs.current.get(expandedRouteBookingId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [expandedRouteBookingId]);

  useEffect(() => {
    if (!newBookingNotice) return;
    const timeout = window.setTimeout(() => setNewBookingNotice(null), 12000);
    return () => window.clearTimeout(timeout);
  }, [newBookingNotice]);

  const handleSignOut = () => {
    signOut();
    router.replace("/");
  };

  // Open Edit Profile Modal
  const handleOpenEditProfile = () => {
    setEditFullName(profile?.full_name || providerRecord?.owner_name || "");
    setEditPhone(profile?.phone || providerRecord?.phone || "");
    setEditCity(providerRecord?.city || profile?.city || "");
    setEditExperienceYears(providerRecord?.experience_years ? String(providerRecord.experience_years) : "");
    setEditDescription(providerRecord?.description || "");
    setEditServiceAreas(Array.isArray(providerRecord?.service_areas) ? providerRecord.service_areas.join(", ") : "");
    setProfileMessage(null);
    setIsEditingProfile(true);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setProfileMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          full_name: editFullName.trim(),
          phone: editPhone.trim(),
          city: editCity.trim(),
          experience_years: editExperienceYears ? Number(editExperienceYears) : undefined,
          description: editDescription.trim(),
          service_areas: editServiceAreas ? editServiceAreas.split(",").map((s) => s.trim()).filter(Boolean) : [],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setProfileMessage("Profile updated successfully! ✅");
      await loadData(user.id, false);
      setTimeout(() => {
        setIsEditingProfile(false);
        setProfileMessage(null);
      }, 1200);
    } catch (err: any) {
      setProfileMessage(`Error: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  // Upload Avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setProfileMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", user.id);

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload avatar.");
      }

      setProfile((prev: any) => ({ ...prev, avatar_url: data.avatar_url }));
      setProfileMessage("Profile photo updated! 📸");
    } catch (err: any) {
      setProfileMessage(`Avatar error: ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Remove Avatar
  const handleAvatarRemove = async () => {
    if (!user) return;
    setUploadingAvatar(true);

    try {
      const res = await fetch(`/api/profile/avatar?user_id=${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove avatar.");
      }

      setProfile((prev: any) => ({ ...prev, avatar_url: null }));
      setProfileMessage("Profile photo removed.");
    } catch (err: any) {
      setProfileMessage(`Avatar error: ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
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

      const updatedBooking = data.booking;
      setBookings((prev) => prev.map((item) => item.id === booking.id ? { ...item, ...updatedBooking } : item));
      const isTransport = updatedBooking?.service_type === "Transport" || !!updatedBooking?.pickup_location;
      if (isTransport && (updatedBooking?.status === "confirmed" || updatedBooking?.status === "accepted")) {
        setExpandedRouteBookingId(String(updatedBooking.id));
      }
    } catch (err: any) {
      alert(`Error accepting booking: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // ── Mark as Completed Handler (PART B FIX) ──
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
        throw new Error(data.error || "Failed to update booking status");
      }

      setBookings((prev) => prev.map((item) => item.id === booking.id ? { ...item, ...data.booking } : item));
    } catch (err: any) {
      alert(`Error completing booking: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // ── Service Availability Toggle ──
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

  // ── Summary Metrics ──
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

  // Computed Identity Data
  const displayName = profile?.full_name || providerRecord?.owner_name || user?.email?.split("@")[0] || "Provider";
  const displayLocation = providerRecord?.city || profile?.city || "Jamui, Bihar";
  const isVerified = providerRecord?.is_verified === true;
  const avatarUrl = profile?.avatar_url;
  const initials = displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

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
        {/* ── PART A: RIDER / PROVIDER PROFILE HEADER ── */}
        <div className="relative rounded-3xl border border-zinc-200 bg-[#0f0a1e] text-white p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-violet-600/20 blur-[80px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-cyan-600/20 blur-[80px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              {/* Profile Photo Avatar with Edit Affordance */}
              <div className="relative group shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-400/80 shadow-lg shadow-cyan-500/20"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-violet-600 to-pink-500 p-0.5 shadow-lg shadow-cyan-500/30">
                    <div className="w-full h-full rounded-2xl bg-[#140b2a] flex items-center justify-center text-2xl font-black text-white">
                      {initials || "🚗"}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-cyan-500 text-zinc-950 font-bold text-xs shadow-md hover:scale-110 transition-transform"
                  title="Change profile photo"
                >
                  ✏️
                </button>
              </div>

              <div>
                {/* Real Verification Badge & Online Status */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-300 backdrop-blur-md">
                      ✦ Verified Evigo Partner
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-xs font-bold text-amber-300 backdrop-blur-md">
                      ⏳ Evigo Transport Partner
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 text-[11px] font-bold text-cyan-300">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    Online · Accepting Requests
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
                  Welcome, {displayName}
                </h1>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-zinc-400 font-medium">
                  <span>🚗 Transport Partner / Rider</span>
                  <span>•</span>
                  <span>📍 {displayLocation}</span>
                  <span>•</span>
                  <span className="text-zinc-300 font-mono">✉️ {user.email}</span>
                </div>
              </div>
            </div>

            {/* Notification Bell, Edit Profile, Add Listing & Sign Out */}
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 border-t lg:border-t-0 border-white/10 pt-4 lg:pt-0">
              <button
                onClick={handleOpenEditProfile}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>✏️</span>
                <span>Edit Profile</span>
              </button>

              <NotificationBell
                userId={user.id}
                dashboardHref="/provider/dashboard"
                onNewBooking={handleRealtimeBooking}
              />

              <button
                onClick={() => loadData(user.id)}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-colors"
                title="Refresh Dashboard"
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

        {newBookingNotice && (
          <div role="status" className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="font-black">🚗 New booking request</div>
              <p className="mt-1 whitespace-pre-line break-words text-xs leading-5">{newBookingNotice.message}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {newBookingNotice.booking_id && (
                <a href={`/provider/dashboard#booking-${newBookingNotice.booking_id}`} className="font-bold text-emerald-800 underline underline-offset-4">View Booking</a>
              )}
              <button type="button" onClick={() => setNewBookingNotice(null)} aria-label="Dismiss new booking notice" className="grid h-9 w-9 place-items-center rounded-full text-lg text-emerald-900 hover:bg-emerald-100">×</button>
            </div>
          </div>
        )}

        {/* Summary Metrics Cards */}
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

        {/* Service Availability Section */}
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
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${svc.is_available
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${svc.is_available
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

        {/* Bookings Section */}
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

            {/* Filter Tabs */}
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
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all ${activeFilter === tab.id
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
                    id={`booking-${b.id}`}
                    ref={(element) => {
                      if (element) bookingCardRefs.current.set(String(b.id), element);
                      else bookingCardRefs.current.delete(String(b.id));
                    }}
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
                        {isTransport && (
                          <span className="mb-1 inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-800">
                            🚗 Transport
                          </span>
                        )}
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

                    {/* Action Buttons: Accept / Reject / Complete (PART B FIX) */}
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
                            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
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
                      {isTransport && isConfirmed && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setExpandedRouteBookingId((current) => current === String(b.id) ? null : String(b.id))}
                            className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                          >
                            {expandedRouteBookingId === String(b.id) ? "Hide Trip Route" : "View Trip Route"}
                          </button>
                          {expandedRouteBookingId === String(b.id) && <TransportRoutePanel booking={b} />}
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

      {/* ── EDIT PROFILE MODAL (PART A) ── */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl text-zinc-900">
            <div className="flex items-center justify-between mb-5 border-b border-zinc-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-600 block">Rider / Partner Profile</span>
                <h3 className="text-xl font-black text-zinc-900">Edit Provider Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="rounded-full bg-zinc-100 p-2 text-zinc-500 hover:bg-zinc-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Profile Photo Upload Section */}
            <div className="mb-6 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex items-center gap-4">
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-16 h-16 rounded-2xl object-cover border border-zinc-200 shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-violet-600 text-white flex items-center justify-center text-xl font-black">
                    {initials || "🚗"}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-zinc-800">Profile Photo</div>
                <div className="text-[11px] text-zinc-500 mb-2">Upload your photo to personalize your rider identity</div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {uploadingAvatar ? "Uploading..." : "Upload Photo"}
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      disabled={uploadingAvatar}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">Authenticated Email (Read-Only)</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2.5 text-xs text-zinc-500 font-medium cursor-not-allowed"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    required
                    placeholder="e.g. Pranav Kumar"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs text-zinc-900 font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs text-zinc-900 font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">City / Hub Location</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="e.g. Jamui, Bihar"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs text-zinc-900 font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    value={editExperienceYears}
                    onChange={(e) => setEditExperienceYears(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs text-zinc-900 font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Service Areas (Comma Separated)</label>
                <input
                  type="text"
                  value={editServiceAreas}
                  onChange={(e) => setEditServiceAreas(e.target.value)}
                  placeholder="e.g. Jamui, Patna, Gaya, Deoghar, Bhagalpur"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs text-zinc-900 font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">About You / Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Describe your mobility fleet, experience, and service guarantees..."
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs text-zinc-900 font-medium outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              {profileMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    profileMessage.startsWith("Error")
                      ? "bg-rose-50 border border-rose-200 text-rose-800"
                      : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  }`}
                >
                  {profileMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {savingProfile ? "Saving..." : "Save Changes ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
