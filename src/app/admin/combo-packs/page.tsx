"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/Container";
import { useAuth } from "@/context/AuthContext";
import { isAllowedAdminEmail } from "@/lib/admin";
import { ComboPack, COMBO_CATEGORIES, COMBO_CATEGORY_METADATA } from "@/lib/combo";

export default function AdminComboPacksPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"packs" | "bookings">("packs");

  const [comboPacks, setComboPacks] = useState<ComboPack[]>([]);
  const [comboBookings, setComboBookings] = useState<any[]>([]);
  const [bookingSummary, setBookingSummary] = useState<any>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // New Combo Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<string>("Travel + Stay");
  const [newDescription, setNewDescription] = useState("");
  const [newCity, setNewCity] = useState("Jamui, Bihar");
  const [newDuration, setNewDuration] = useState("2 Days / 1 Night");
  const [newBasePrice, setNewBasePrice] = useState("5000");
  const [newDiscount, setNewDiscount] = useState("500");
  const [newImageUrl, setNewImageUrl] = useState("/partners/events/usha_nand/usha_nand_1.png");
  const [newItems, setNewItems] = useState([
    { service_type: "Transport", quantity: 1, is_required: true },
    { service_type: "Hotel Stay", quantity: 1, is_required: true },
  ]);

  const isAdmin = !!user?.email && isAllowedAdminEmail(user.email);

  const loadData = useCallback(async () => {
    if (!user?.email || !isAllowedAdminEmail(user.email)) return;
    try {
      setLoadingData(true);
      setError(null);

      const headers = {
        "x-user-email": user.email,
        "x-user-role": user.role ?? "provider",
      };

      // 1. Fetch all combo packs (including inactive)
      const packsRes = await fetch("/api/admin/combo-packs", { headers });
      const packsData = await packsRes.json();
      if (packsData.success && Array.isArray(packsData.comboPacks)) {
        setComboPacks(packsData.comboPacks);
      }

      // 2. Fetch all combo bookings
      const bookingsRes = await fetch("/api/admin/combo-bookings", { headers });
      const bookingsData = await bookingsRes.json();
      if (bookingsData.success && Array.isArray(bookingsData.bookings)) {
        setComboBookings(bookingsData.bookings);
        setBookingSummary(bookingsData.summary);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load admin combo data");
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login/provider");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    void loadData();
  }, [loading, user, isAdmin, router, loadData]);

  const handleToggleActive = async (packId: string, currentActive: boolean) => {
    if (!user?.email) return;
    setActionInProgress(packId);
    try {
      const res = await fetch("/api/admin/combo-packs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user.email,
          "x-user-role": user.role ?? "provider",
        },
        body: JSON.stringify({ id: packId, is_active: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update package");

      setComboPacks((prev) =>
        prev.map((p) => (p.id === packId ? { ...p, is_active: !currentActive } : p))
      );
    } catch (err: any) {
      alert(`Error updating package: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeletePack = async (packId: string) => {
    if (!user?.email || !confirm("Are you sure you want to permanently remove this combo package?")) return;
    setActionInProgress(packId);
    try {
      const res = await fetch(`/api/admin/combo-packs?id=${encodeURIComponent(packId)}`, {
        method: "DELETE",
        headers: {
          "x-user-email": user.email,
          "x-user-role": user.role ?? "provider",
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete package");

      setComboPacks((prev) => prev.filter((p) => p.id !== packId));
    } catch (err: any) {
      alert(`Error deleting package: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    setActionInProgress("create");
    try {
      const payload = {
        name: newName.trim(),
        category: newCategory,
        description: newDescription.trim(),
        city: newCity.trim(),
        duration: newDuration.trim(),
        base_price: parseFloat(newBasePrice) || 0,
        discount: parseFloat(newDiscount) || 0,
        image_url: newImageUrl.trim(),
        items: newItems.filter((it) => it.service_type.trim()),
      };

      const res = await fetch("/api/admin/combo-packs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user.email,
          "x-user-role": user.role ?? "provider",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create package");

      setIsCreateModalOpen(false);
      setNewName("");
      setNewDescription("");
      void loadData();
    } catch (err: any) {
      alert(`Error creating package: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05030f] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Verifying Admin Authorization...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05030f] text-white selection:bg-cyan-500/30 py-12">
      <Container>
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-300 border border-cyan-500/30">
                🛡️ Platform Management
              </span>
              <span className="text-xs text-zinc-400 font-mono">admin: {user.email}</span>
            </div>
            <h1 className="text-3xl font-black text-white">Combo Packages Administration</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Create, configure, and monitor multi-service combo bundles and real-time customer bookings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/providers"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/10 transition-colors"
            >
              ← Provider Reviews
            </Link>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 hover:scale-105 transition-all flex items-center gap-2"
            >
              <span>+ Create Combo Package</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Packages</div>
            <div className="text-3xl font-black text-white mt-1">{comboPacks.length}</div>
            <div className="text-[11px] text-cyan-400 mt-1">
              {comboPacks.filter((p) => p.is_active).length} Active Online
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Bookings</div>
            <div className="text-3xl font-black text-white mt-1">{comboBookings.length}</div>
            <div className="text-[11px] text-amber-300 mt-1">
              {bookingSummary?.pending || 0} Pending Confirmation
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Confirmed Combos</div>
            <div className="text-3xl font-black text-emerald-400 mt-1">{bookingSummary?.confirmed || 0}</div>
            <div className="text-[11px] text-emerald-300/80 mt-1">
              {bookingSummary?.partially_confirmed || 0} Partially Confirmed
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Revenue Value</div>
            <div className="text-3xl font-black text-white mt-1">
              ₹{(bookingSummary?.total_revenue || 0).toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-violet-400 mt-1">Active Bookings Value</div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-8">
          <button
            onClick={() => setActiveTab("packs")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
              activeTab === "packs"
                ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white border-transparent shadow-md"
                : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
            }`}
          >
            Manage Packages ({comboPacks.length})
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
              activeTab === "bookings"
                ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white border-transparent shadow-md"
                : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
            }`}
          >
            Customer Bookings ({comboBookings.length})
          </button>
        </div>

        {/* Tab Content */}
        {loadingData ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-16 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto mb-3" />
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Loading Package Catalog...
            </div>
          </div>
        ) : activeTab === "packs" ? (
          /* Packages Table / Grid */
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {comboPacks.map((pack) => {
              const meta = COMBO_CATEGORY_METADATA[pack.category] || { icon: "🎁" };
              return (
                <div
                  key={pack.id}
                  className="rounded-3xl border border-white/10 bg-[#0d091e] p-5 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-0.5 text-[11px] font-bold text-cyan-300">
                        {meta.icon} {pack.category}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          pack.is_active
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                        }`}
                      >
                        {pack.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-white mb-1">{pack.name}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{pack.description}</p>

                    <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3 text-xs space-y-1 mb-4">
                      <div className="flex justify-between text-zinc-400">
                        <span>Duration:</span>
                        <strong className="text-white">{pack.duration}</strong>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>City:</span>
                        <strong className="text-white">{pack.city}</strong>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Final Price:</span>
                        <strong className="text-emerald-400">₹{pack.final_price} (Save ₹{pack.discount})</strong>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Included Items:</span>
                        <strong className="text-cyan-300">{pack.items?.length || 0} Services</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={actionInProgress === pack.id}
                      onClick={() => handleToggleActive(pack.id, pack.is_active)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        pack.is_active
                          ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {pack.is_active ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      type="button"
                      disabled={actionInProgress === pack.id}
                      onClick={() => handleDeletePack(pack.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Bookings Table */
          <div className="rounded-3xl border border-white/10 bg-[#0d091e] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[0.02] text-zinc-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Booking ID</th>
                    <th className="p-4">Package</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Travel Date</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Overall Status</th>
                    <th className="p-4">Services Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {comboBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-mono text-cyan-300">#{b.id.slice(-6).toUpperCase()}</td>
                      <td className="p-4 font-bold text-white">{b.combo_name}</td>
                      <td className="p-4">
                        <div className="text-white font-medium">{b.customer_name}</div>
                        <div className="text-zinc-500 text-[11px]">{b.customer_phone}</div>
                      </td>
                      <td className="p-4 text-zinc-300">{b.start_date || b.booking_date}</td>
                      <td className="p-4 font-bold text-emerald-400">₹{Number(b.total_amount).toLocaleString("en-IN")}</td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                            b.status === "confirmed"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : b.status === "completed"
                              ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                              : b.status === "rejected"
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : b.status === "cancelled"
                              ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {b.items && b.items.length > 0 ? (
                            b.items.map((it: any, idx: number) => (
                              <span
                                key={it.id || idx}
                                className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-zinc-300"
                                title={`${it.service_type}: ${it.provider_booking_status}`}
                              >
                                {it.service_type}: {it.provider_booking_status}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-500">None</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Combo Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
            <div className="relative my-8 w-full max-w-2xl rounded-3xl border border-white/20 bg-[#0d091e] p-6 sm:p-8 text-white shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>🎁</span> Create New Combo Package
                </h2>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-full bg-white/10 p-2 text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePackage} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Package Title *</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Jamui Royal Heritage & Resort Stay"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Category *</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#160e2e] px-4 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    >
                      {COMBO_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">City / Region</label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="Jamui, Bihar"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Base Price (₹) *</label>
                    <input
                      type="number"
                      required
                      value={newBasePrice}
                      onChange={(e) => setNewBasePrice(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Discount (₹)</label>
                    <input
                      type="number"
                      value={newDiscount}
                      onChange={(e) => setNewDiscount(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Duration</label>
                    <input
                      type="text"
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      placeholder="e.g. 2 Days / 1 Night"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Image URL</label>
                    <input
                      type="text"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="/partners/events/usha_nand/usha_nand_1.png"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Detailed description of what is included in this bundle..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-xl border border-white/20 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "create"}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {actionInProgress === "create" ? "Saving..." : "Create Package"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
