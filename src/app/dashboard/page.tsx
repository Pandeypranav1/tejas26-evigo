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

    const loadData = () => {
      const all = getDemoBookings();
      const mine = all.filter((b) => b.clientUid === user.id);
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

  return (
    <main className="flex-1 py-10">
      <Container>
        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 relative overflow-hidden">
          {/* Subtle background decoration */}
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
                  Welcome, {user?.phone || "Guest"}
                </h1>
                <p className="mt-2 text-sm font-medium text-zinc-500 max-w-lg mx-auto sm:mx-0">
                  Track your event bookings, manage your profile, and explore top-rated services for your next event.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                <Link href="/explore" className="w-full sm:w-auto">
                  <Button className="w-full shadow-lg shadow-cyan-500/20 bg-gradient-to-r from-cyan-500 to-blue-500 border-0 text-white hover:opacity-90">Book a Service</Button>
                </Link>
                <Button variant="secondary" onClick={handleSignOut} className="w-full sm:w-auto hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings */}
        <div className="mt-8">
          {bookings.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
              <div style={{ fontSize: 48 }} className="mb-4">📋</div>
              <div className="text-xl font-black text-zinc-800">No bookings yet</div>
              <div className="mt-2 text-sm font-semibold text-zinc-500 max-w-xs mx-auto">
                Head to Explore and click &ldquo;Book Now&rdquo; on any provider.
              </div>
              <Link href="/explore" className="inline-block mt-6">
                <Button>Explore Providers →</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 hover:shadow-sm transition"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-sm font-black text-zinc-900">Booking Request</div>
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
                      <div className="text-sm font-semibold text-zinc-600">📅 {b.eventDate}</div>
                      <div className="text-sm font-semibold text-zinc-600">📍 {b.location}</div>
                      {b.notes && (
                        <div className="mt-1 text-sm text-zinc-500">📝 {b.notes}</div>
                      )}
                    </div>
                    <div className="text-xs font-mono text-zinc-400">
                      #{b.id.slice(-8)}
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
