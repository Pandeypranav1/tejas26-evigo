"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/Container";
import { ComboPack, ComboPackCategory, COMBO_CATEGORIES, COMBO_CATEGORY_METADATA } from "@/lib/combo";
import { ComboPackCard } from "@/components/ComboPackCard";
import { ComboBookingModal } from "@/components/ComboBookingModal";

export default function ComboPacksPage() {
  const [comboPacks, setComboPacks] = useState<ComboPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPack, setSelectedPack] = useState<ComboPack | null>(null);

  const loadComboPacks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/combo-packs");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.comboPacks)) {
        setComboPacks(data.comboPacks);
      } else {
        throw new Error(data.error || "Failed to load combo packages");
      }
    } catch (err: any) {
      console.error("[ComboPacksPage] Error:", err);
      setError(err?.message || "Failed to fetch combo packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComboPacks();
  }, []);

  const filteredPacks = useMemo(() => {
    return comboPacks.filter((pack) => {
      const matchCategory =
        selectedCategory === "All" || pack.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        pack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pack.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pack.city.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [comboPacks, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#05030f] text-white selection:bg-cyan-500/30 relative overflow-x-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute -top-40 left-1/4 w-[600px] h-[400px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Hero Header Section */}
      <section className="relative pt-24 pb-14 border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/15 via-violet-950/10 to-transparent pointer-events-none" />

        <Container>
          <div className="relative z-10 max-w-3xl">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 mb-6 transition-colors group"
            >
              <span className="transition-transform group-hover:-translate-x-1">&larr;</span>
              <span>Back to Home</span>
            </Link>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-md">
                <span>🎁</span> Multi-Service Bundles & Travel Packages
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 backdrop-blur-md">
                <span>⚡</span> Guaranteed Savings & Verified Providers
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4 text-white leading-[1.1]">
              Evigo Combo Packs
            </h1>
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl">
              Save time and money with all-in-one curated packages combining cab transport, hotel rooms, heritage guides, banquet venues, and catering across Bihar.
            </p>
          </div>
        </Container>
      </section>

      {/* Main Content & Filters */}
      <section className="py-10 md:py-14 relative z-10">
        <Container>
          {/* Controls Bar: Category Pills + Search */}
          <div className="mb-10 space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none flex-1">
                <button
                  onClick={() => setSelectedCategory("All")}
                  className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                    selectedCategory === "All"
                      ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]"
                      : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>All Combos</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                    {comboPacks.length}
                  </span>
                </button>

                {COMBO_CATEGORIES.map((cat) => {
                  const meta = COMBO_CATEGORY_METADATA[cat];
                  const isActive = selectedCategory === cat;
                  const count = comboPacks.filter((p) => p.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                        isActive
                          ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]"
                          : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{meta.icon}</span>
                      <span>{cat}</span>
                      {count > 0 && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="w-full md:w-72 shrink-0">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by city, service or title..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none backdrop-blur-md"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic State Rendering */}
          {loading ? (
            /* Loading Skeletons */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 h-96 animate-pulse flex flex-col justify-between"
                >
                  <div className="aspect-[16/10] rounded-2xl bg-white/5" />
                  <div className="space-y-3 mt-4">
                    <div className="h-4 w-3/4 rounded bg-white/10" />
                    <div className="h-3 w-full rounded bg-white/5" />
                    <div className="h-3 w-2/3 rounded bg-white/5" />
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <div className="h-6 w-24 rounded bg-white/10" />
                    <div className="h-9 w-28 rounded-2xl bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-12 text-center max-w-xl mx-auto backdrop-blur-md">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="text-lg font-bold text-white mb-2">Unable to Load Combo Packs</h3>
              <p className="text-xs text-zinc-300 mb-6">{error}</p>
              <button
                onClick={loadComboPacks}
                className="rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 hover:scale-105 transition-all"
              >
                Retry Loading
              </button>
            </div>
          ) : filteredPacks.length > 0 ? (
            /* Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPacks.map((pack) => (
                <ComboPackCard
                  key={pack.id}
                  pack={pack}
                  onSelect={(p) => setSelectedPack(p)}
                />
              ))}
            </div>
          ) : (
            /* Promotional Coming Soon Banner Empty State */
            <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
              <div className="relative w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.02] shadow-[0_0_50px_rgba(6,182,212,0.12)] overflow-hidden transition-all duration-300">
                <Image
                  src="/display 2 banner.jpg"
                  alt="Evigo Combo Packs - Exciting Combo Deals Coming Soon"
                  width={1400}
                  height={700}
                  priority
                  className="w-full h-auto object-contain block"
                />
              </div>

              {(selectedCategory !== "All" || searchQuery.trim()) && (
                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedCategory("All");
                      setSearchQuery("");
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 px-5 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 transition-all shadow-sm"
                  >
                    <span>Reset All Filters</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </Container>
      </section>

      {/* Booking Details Modal */}
      {selectedPack && (
        <ComboBookingModal
          pack={selectedPack}
          onClose={() => setSelectedPack(null)}
          onBookingSuccess={() => {
            loadComboPacks();
          }}
        />
      )}
    </div>
  );
}
