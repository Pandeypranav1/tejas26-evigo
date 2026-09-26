"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import type { DemoBooking } from "@/lib/demoStore";
import { getDemoBookings } from "@/lib/demoStore";
import { ProfileUpload } from "@/components/ProfileUpload";

export default function ClientDashboard() {
  const router = useRouter();
  const { user, role, loading, signOut } = useAuth();
  const [bookings, setBookings] = useState<DemoBooking[]>([]);

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

    const loadData = async () => {
      const all = getDemoBookings();
      const mine = [...all.filter((b) => b.clientUid === user.id)];

      try {
        const queryParam = user.email ? `email=${encodeURIComponent(user.email)}` : `client_id=${user.id}`;
        const res = await fetch(`/api/bookings?${queryParam}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.bookings)) {
          const localIds = new Set(mine.map((b) => b.id));
          for (const sb of data.bookings) {
            if (!localIds.has(sb.id)) {
              mine.unshift({
                id: sb.id,
                providerId: sb.provider_id || sb.provider_uuid || "faab-cab",
                providerOwnerUid: "faab-cab-owner",
                clientUid: sb.client_id || user.id,
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
        console.warn("[ClientDashboard] Error fetching Supabase bookings:", err);
      }

      setBookings(mine);
    };

    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, [loading, role, router, user]);

  const handleSignOut = () => {
    signOut();
    router.replace("/");
  };

  const statusColor = {
    pending: "#f59e0b",
    accepted: "#10b981",
    rejected: "#ef4444",
  };

  const statusLabel = {
    pending: "⏳ Pending",
    accepted: "✅ Accepted",
    rejected: "❌ Rejected",
  };

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
        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none"></div>

          <div className="shrink-0 z-10">
            <ProfileUpload />
          </div>

          <div className="flex-1 text-center sm:text-left z-10 w-full flex flex-col justify-center">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1 text-xs font-bold text-cyan-700 mb-3">
                  👤 Client Dashboard
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
                  Welcome, {user?.email || "Guest"}
                </h1>
                <p className="mt-2 text-sm font-medium text-zinc-500 max-w-lg mx-auto sm:mx-0">
                  Track your transport bookings, venue requests, and explore top-rated services for your trip or event.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                <Link href="/travel-tourism/faabcab" className="w-full sm:w-auto">
                  <Button className="w-full shadow-lg shadow-cyan-500/20 bg-gradient-to-r from-cyan-500 to-violet-600 border-0 text-white font-bold text-xs py-2.5 px-4">
                    Book Transport
                  </Button>
                </Link>
                <Link href="/explore" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full text-xs py-2.5 px-4">Explore Events</Button>
                </Link>
                <Button variant="secondary" onClick={handleSignOut} className="w-full sm:w-auto text-xs py-2.5 px-4 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings */}
        <div className="mt-8">
          <h2 className="text-xl font-black text-zinc-900 mb-4 flex items-center gap-2">
            <span>📋</span> Your Bookings & Transport Requests ({bookings.length})
          </h2>

          {bookings.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
              <div style={{ fontSize: 48 }} className="mb-4">🚗</div>
              <div className="text-xl font-black text-zinc-800">No bookings yet</div>
              <div className="mt-2 text-sm font-semibold text-zinc-500 max-w-xs mx-auto">
                Book transport with FaabCab or explore venue providers to get started.
              </div>
              <div className="flex justify-center gap-3 mt-6">
                <Link href="/travel-tourism/faabcab">
                  <Button className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-xs">
                    Book FaabCab Transport
                  </Button>
                </Link>
                <Link href="/explore">
                  <Button variant="secondary" className="text-xs">Explore Providers</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-base font-black text-zinc-900">
                          {b.providerId === "faab-cab" || b.serviceType === "Transport" ? "🚗 FaabCab Transport Booking" : "Booking Request"}
                        </div>
                        <span
                          style={{
                            background: `${statusColor[b.status]}15`,
                            border: `1px solid ${statusColor[b.status]}40`,
                            color: statusColor[b.status],
                            borderRadius: 100,
                            padding: "2px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {statusLabel[b.status]}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-semibold text-zinc-600 mt-2">
                        {b.transportService && <div>🚗 <strong>Service:</strong> {b.transportService}</div>}
                        {b.pickupLocation && <div>📍 <strong>Pickup:</strong> {b.pickupLocation}</div>}
                        {b.dropLocation && <div>🏁 <strong>Destination:</strong> {b.dropLocation}</div>}
                        <div>📅 <strong>Travel Date:</strong> {b.eventDate}</div>
                        {b.pickupTime && <div>⏰ <strong>Pickup Time:</strong> {b.pickupTime}</div>}
                        {b.passengerCount && <div>👥 <strong>Passengers:</strong> {b.passengerCount}</div>}
                        {!b.pickupLocation && <div>📍 <strong>Location:</strong> {b.location}</div>}
                      </div>

                      {b.notes && (
                        <div className="mt-3 text-xs text-zinc-600 bg-zinc-50 p-3 rounded-xl border border-zinc-200/60">
                          💬 <strong>Special Request:</strong> "{b.notes}"
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-mono text-zinc-400 shrink-0">
                      ID: #{b.id.slice(-8)}
                    </div>
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
