"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import type { DemoBooking, DemoProvider } from "@/lib/demoStore";
import { getDemoBookings, getDemoProviders, updateDemoBookingStatus, deleteDemoProvider } from "@/lib/demoStore";
import { ProfileUpload } from "@/components/ProfileUpload";

export default function ProviderDashboard() {
  const router = useRouter();
  const { user, role, loading, signOut } = useAuth();
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [myListings, setMyListings] = useState<DemoProvider[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

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

    // Load bookings for this provider's listings + Supabase transport bookings
    const loadData = async () => {
      const allBookings = getDemoBookings();
      const allProviders = getDemoProviders();
      const mine = allProviders.filter((p) => p.ownerUid === user.id || p.id === "faab-cab");
      const myIds = new Set(mine.map((p) => p.id));
      myIds.add("faab-cab");

      const myBookings = [...allBookings.filter((b) => myIds.has(b.providerId))];

      try {
        const res = await fetch(`/api/bookings?provider_id=faab-cab`);
        const data = await res.json();
        if (data.success && Array.isArray(data.bookings)) {
          const localIds = new Set(myBookings.map((b) => b.id));
          for (const sb of data.bookings) {
            if (!localIds.has(sb.id)) {
              myBookings.unshift({
                id: sb.id,
                providerId: sb.provider_id || sb.provider_uuid || "faab-cab",
                providerOwnerUid: "faab-cab-owner",
                clientUid: sb.client_id || "guest",
                clientPhone: sb.customer_phone || "",
                customerName: sb.customer_name,
                customerEmail: sb.customer_email,
                serviceType: sb.service_type,
                transportService: sb.transport_service || sb.service_type,
                pickupLocation: sb.pickup_location,
                dropLocation: sb.drop_location,
                pickupTime: sb.pickup_time || sb.event_time,
                passengerCount: sb.passenger_count || sb.guest_count,
                eventDate: sb.travel_date || sb.event_date || "",
                location: sb.pickup_location && sb.drop_location ? `${sb.pickup_location} → ${sb.drop_location}` : (sb.city || "Jamui, Bihar"),
                notes: sb.message || "",
                status: sb.status || "pending",
                createdAt: new Date(sb.created_at || Date.now()).getTime(),
                updatedAt: Date.now(),
              });
            }
          }
        }
      } catch (err) {
        console.warn("[ProviderDashboard] Failed to fetch Supabase bookings:", err);
      }

      setMyListings(mine);
      setBookings(myBookings);
    };

    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, [loading, role, router, user]);

  const act = (id: string, next: "accepted" | "rejected") => {
    setUpdating(id);
    updateDemoBookingStatus(id, next);

    // Also sync to Supabase API
    fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    }).catch(() => {});

    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: next } : b))
    );
    setTimeout(() => setUpdating(null), 400);
  };

  const handleDeleteListing = (id: string) => {
    if (window.confirm("Are you sure you want to remove this listing?")) {
      deleteDemoProvider(id);
      setMyListings((prev) => prev.filter((l) => l.id !== id));
      window.dispatchEvent(new Event("storage"));
    }
  };

  const handleSignOut = () => {
    signOut();
    router.replace("/");
  };

  const statusColor = {
    pending: "#f59e0b",
    accepted: "#10b981",
    rejected: "#ef4444",
  };

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
        {/* Profile Header Card */}
        <div className="relative rounded-3xl border border-zinc-200 bg-[#0f0a1e] text-white p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-violet-600/20 blur-[80px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-cyan-600/20 blur-[80px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ProfileUpload />
              <div className="text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300 mb-2 backdrop-blur-md">
                  🚗 Transport & Event Service Partner
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
                  {user?.email || "Provider Account"}
                </h1>
                <p className="text-xs text-zinc-400">
                  Manage incoming customer bookings, view journey details, and accept requests.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 border-t lg:border-t-0 border-white/10 pt-4 lg:pt-0">
              <Link href="/partner">
                <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold text-xs py-2.5 px-4 shadow-lg">
                  + Add New Listing
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: "Total Bookings", value: bookings.length.toString(), icon: "📅", color: "from-blue-500/10 to-cyan-500/10", text: "text-cyan-700" },
            { label: "Pending Requests", value: bookings.filter(b => b.status === 'pending').length.toString(), icon: "⏳", color: "from-amber-500/10 to-orange-500/10", text: "text-amber-700" },
            { label: "Accepted Requests", value: bookings.filter(b => b.status === 'accepted').length.toString(), icon: "✅", color: "from-emerald-500/10 to-green-500/10", text: "text-emerald-700" },
            { label: "Active Listings", value: myListings.length.toString(), icon: "🎪", color: "from-purple-500/10 to-violet-500/10", text: "text-violet-700" },
          ].map((stat, idx) => (
            <div key={idx} className={`rounded-2xl border border-zinc-200 bg-gradient-to-br ${stat.color} p-4 sm:p-5 flex items-center justify-between shadow-sm`}>
              <div>
                <div className="text-xs font-bold text-zinc-500">{stat.label}</div>
                <div className={`text-2xl sm:text-3xl font-black ${stat.text} mt-1`}>{stat.value}</div>
              </div>
              <div className="text-2xl sm:text-3xl opacity-80">{stat.icon}</div>
            </div>
          ))}
        </div>

        {/* Listings Section */}
        {myListings.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-black text-zinc-900 mb-4 flex items-center gap-2">
              <span>🎪</span> Your Service Listings ({myListings.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myListings.map((l) => (
                <div key={l.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-violet-600 uppercase tracking-wider">{l.category}</div>
                    <div className="text-base font-black text-zinc-900 mt-0.5">{l.businessName}</div>
                    <div className="text-xs text-zinc-500 font-medium">📍 {l.city}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteListing(l.id)}
                    className="text-xs font-bold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings Section */}
        <div id="bookings-section" className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
              <span>📥</span> Customer Bookings & Transport Requests ({bookings.length})
            </h2>
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-zinc-200 bg-white p-10 text-center">
              <div style={{ fontSize: 48 }} className="mb-4">📬</div>
              <div className="text-lg font-black text-zinc-800">No booking requests yet</div>
              <div className="mt-2 text-sm font-semibold text-zinc-500 max-w-sm mx-auto">
                Customer transport & event service requests will appear here in real-time.
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-6 hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
                >
                  <div className={`absolute top-0 left-0 w-full h-1.5 ${
                    b.status === 'pending' ? 'bg-amber-400' :
                    b.status === 'accepted' ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="px-2.5 py-1 text-[11px] font-black rounded-full uppercase"
                        style={{
                          background: `${statusColor[b.status]}15`,
                          color: statusColor[b.status],
                        }}
                      >
                        {b.status}
                      </span>
                      <span className="text-xs font-bold text-zinc-500">📅 {b.eventDate}</span>
                    </div>

                    <div className="font-black text-base text-zinc-900 mb-1">
                      Customer: {b.customerName || "Customer"}
                    </div>

                    <div className="space-y-1.5 text-xs text-zinc-600 mb-3 font-medium">
                      {b.clientPhone && <div>📞 <strong>Phone:</strong> {b.clientPhone}</div>}
                      {b.customerEmail && <div>✉️ <strong>Email:</strong> {b.customerEmail}</div>}
                      {b.transportService && <div>🚗 <strong>Service:</strong> {b.transportService}</div>}
                      {b.pickupLocation && <div>📍 <strong>Pickup:</strong> {b.pickupLocation}</div>}
                      {b.dropLocation && <div>🏁 <strong>Destination:</strong> {b.dropLocation}</div>}
                      {b.pickupTime && <div>⏰ <strong>Time:</strong> {b.pickupTime}</div>}
                      {b.passengerCount && <div>👥 <strong>Passengers:</strong> {b.passengerCount}</div>}
                      {!b.pickupLocation && <div>📍 <strong>Location:</strong> {b.location}</div>}
                    </div>

                    {b.notes && (
                      <div className="p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-xs text-zinc-700 font-medium">
                        💬 Special Request: "{b.notes}"
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 mt-4 border-t border-zinc-100">
                    {b.status === 'pending' ? (
                      <>
                        <Button
                          onClick={() => act(b.id, "accepted")}
                          disabled={updating === b.id}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2"
                        >
                          {updating === b.id ? "..." : "Accept"}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => act(b.id, "rejected")}
                          disabled={updating === b.id}
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50 text-xs py-2"
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <div className="w-full text-center text-xs font-bold text-zinc-400 py-1">
                        Status: <span className="uppercase text-zinc-700">{b.status}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
