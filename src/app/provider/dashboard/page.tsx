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

    // Load bookings for this provider's listings
    const loadData = () => {
      const allBookings = getDemoBookings();
      const allProviders = getDemoProviders();
      const mine = allProviders.filter((p) => p.ownerUid === user.id);
      const myIds = new Set(mine.map((p) => p.id));
      const myBookings = allBookings.filter((b) => myIds.has(b.providerId));
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

  return (
    <main className="flex-1 py-10">
      <Container>
        {/* Premium Dark Hero Card */}
        <div className="bg-[#0b0416] rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-10 flex flex-col lg:flex-row items-center lg:items-center gap-8 relative overflow-hidden">
          {/* Glowing background effects */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-violet-600/20 blur-[80px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-cyan-600/20 blur-[80px] pointer-events-none"></div>
          
          <div className="shrink-0 z-10 flex flex-col items-center lg:items-start">
            <ProfileUpload />
          </div>
          
          <div className="flex-1 text-center lg:text-left z-10 w-full flex flex-col justify-center">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-bold text-violet-300 mb-3 backdrop-blur-md">
                  <svg className="w-3.5 h-3.5 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified Provider
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
                  {user?.phone || "Provider"}
                </h1>
                <p className="text-sm font-medium text-zinc-400 max-w-lg mx-auto lg:mx-0">
                  Manage your bookings & grow your service
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                <Link href="/partner" className="w-full sm:w-auto">
                  <Button className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white border-0 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                    + Add Service
                  </Button>
                </Link>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    const el = document.getElementById("bookings-section");
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }} 
                  className="w-full sm:w-auto bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
                >
                  View Bookings
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {[
            { label: "Total Bookings", value: bookings.length.toString(), icon: "📅", color: "from-blue-500/20 to-cyan-500/20", text: "text-cyan-600" },
            { label: "Pending Requests", value: bookings.filter(b => b.status === 'pending').length.toString(), icon: "⏳", color: "from-amber-500/20 to-orange-500/20", text: "text-amber-600" },
            { label: "Completed Jobs", value: bookings.filter(b => b.status === 'accepted').length.toString(), icon: "✅", color: "from-emerald-500/20 to-green-500/20", text: "text-emerald-600" },
            { label: "Earnings (Est)", value: "₹0", icon: "💰", color: "from-violet-500/20 to-purple-500/20", text: "text-violet-600" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm hover:shadow-md hover:border-violet-200 transition-all duration-300 group hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-xl shadow-inner`}>
                  {stat.icon}
                </div>
                <div>
                  <div className="text-2xl font-black text-zinc-900 group-hover:text-violet-600 transition-colors">{stat.value}</div>
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-0.5">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* My Listings */}
        <div className="mt-8">
          <h2 className="text-lg font-black text-zinc-900 mb-3">Your Listings</h2>
          {myListings.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-8 text-center">
              <div style={{ fontSize: 40 }} className="mb-3">📋</div>
              <div className="text-base font-black text-zinc-800">No listings yet</div>
              <div className="mt-1 text-sm font-semibold text-zinc-500">
                Submit the partner form to get your service listed.
              </div>
              <Link href="/partner" className="inline-block mt-4">
                <Button>Register Your Service</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myListings.map((l) => (
                <div
                  key={l.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 hover:border-violet-200 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-black text-zinc-900">{l.businessName}</div>
                      <div className="mt-0.5 text-xs font-semibold text-zinc-500">
                        {l.category} • {l.city}
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      Live
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm font-bold text-violet-700">
                      ₹{l.startingPrice.toLocaleString("en-IN")}+
                    </div>
                    <button
                      onClick={() => handleDeleteListing(l.id)}
                      className="text-xs font-bold text-red-500 hover:text-red-700 underline"
                      title="Remove Listing"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookings */}
        <div id="bookings-section" className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-zinc-900">Recent Requests</h2>
            {bookings.length > 0 && (
              <span className="text-sm font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
                {bookings.filter(b => b.status === 'pending').length} Pending
              </span>
            )}
          </div>
          
          {bookings.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-zinc-200 bg-white p-10 text-center">
              <div style={{ fontSize: 48 }} className="mb-4">📬</div>
              <div className="text-lg font-black text-zinc-800">No booking requests yet</div>
              <div className="mt-2 text-sm font-semibold text-zinc-500 max-w-sm mx-auto">
                Clients will appear here once they book your service. Make sure your listings are attractive!
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-6 hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
                >
                  {/* Status Indicator Bar */}
                  <div className={`absolute top-0 left-0 w-full h-1 ${
                    b.status === 'pending' ? 'bg-amber-400' :
                    b.status === 'accepted' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}></div>
                  
                  <div className="flex flex-col h-full justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="px-2.5 py-1 text-xs font-black rounded-full"
                          style={{
                            background: `${statusColor[b.status]}15`,
                            color: statusColor[b.status],
                          }}
                        >
                          {b.status.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-zinc-400">{b.eventDate}</span>
                      </div>
                      
                      <div className="font-black text-lg text-zinc-900 mb-1 line-clamp-1">
                        Client: {b.clientPhone || b.clientUid.substring(0, 8)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 mb-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {b.location}
                      </div>
                      
                      {b.notes && (
                        <div className="mt-3 p-3 bg-zinc-50 rounded-xl text-sm text-zinc-600 italic line-clamp-2">
                          "{b.notes}"
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-3 border-t border-zinc-100">
                      {b.status === 'pending' ? (
                        <>
                          <Button
                            onClick={() => act(b.id, "accepted")}
                            disabled={updating === b.id}
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 border-0 shadow-lg shadow-emerald-500/20 text-white"
                          >
                            {updating === b.id ? "..." : "Accept"}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => act(b.id, "rejected")}
                            disabled={updating === b.id}
                            className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="secondary" 
                          className="w-full justify-center" 
                          disabled
                        >
                          {b.status === 'accepted' ? 'Job Accepted' : 'Job Rejected'}
                        </Button>
                      )}
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
