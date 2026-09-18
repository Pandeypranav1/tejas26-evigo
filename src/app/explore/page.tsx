"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/Container";
import { SERVICE_CATEGORIES, CATEGORY_IMAGE, EVENT_VENUES } from "@/lib/constants";
import type { ServiceCategory, EventVenue } from "@/lib/constants";
import type { DemoProvider } from "@/lib/demoStore";
import { getDemoProviders, getDemoUser, saveDemoBooking } from "@/lib/demoStore";

/* ─── Price bands ─── */
const PRICE_BANDS = [
  { label: "Any Price",      min: 0,     max: Infinity },
  { label: "Under ₹5,000",  min: 0,     max: 5000 },
  { label: "₹5k – ₹15k",   min: 5000,  max: 15000 },
  { label: "₹15k – ₹50k",  min: 15000, max: 50000 },
  { label: "₹50k+",         min: 50000, max: Infinity },
];

/* ─── Hotel-venue price parser (lowest price from range) ─── */
function parseLowestPrice(range?: string): number {
  if (!range) return 1500;
  // e.g. "₹800–₹2,500/night" → 800
  const match = range.replace(/[₹,]/g, "").match(/^(\d+)/);
  return match ? parseInt(match[1]) : 1500;
}

/* ─── Booking Modal (for DemoProviders) ─── */
function BookingModal({
  provider,
  onClose,
}: {
  provider: DemoProvider | null;
  onClose: () => void;
}) {
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!provider) { setEventDate(""); setLocation(""); setNotes(""); setDone(false); }
  }, [provider]);

  if (!provider) return null;

  const confirm = () => {
    const u = getDemoUser();
    saveDemoBooking({
      providerId: provider.id,
      providerOwnerUid: provider.ownerUid,
      clientUid: u?.uid ?? "guest",
      clientPhone: u?.phone ?? "",
      eventDate,
      location,
      notes,
    });
    setDone(true);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-[460px]" style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.25)" }}>
        {done ? (
          <div className="text-center py-2">
            <div className="text-5xl">✅</div>
            <div className="text-lg font-black text-zinc-900 mt-3">Booking Requested!</div>
            <div className="text-sm text-zinc-500 mt-1.5">
              Your request has been sent to <strong>{provider.businessName}</strong>.
            </div>
            <button onClick={onClose} className="mt-5 w-full py-3 rounded-xl text-sm font-bold text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", border: "none" }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="text-base sm:text-lg font-black text-zinc-900">Book {provider.businessName}</div>
            <div className="text-xs sm:text-[13px] text-zinc-500 mt-0.5 mb-5">{provider.category} · {provider.city}</div>
            <div className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Event Date</span>
                <input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Venue / Location</span>
                <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Wedding Hall, Patna" className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Notes (optional)</span>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Any special requirements..." className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none resize-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-bold text-zinc-600 cursor-pointer">Cancel</button>
              <button onClick={confirm} disabled={!eventDate||!location} className="flex-1 py-2.5 rounded-xl border-none text-sm font-bold text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", opacity:(!eventDate||!location)?0.45:1 }}>
                Confirm Booking
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Provider Card (DemoProvider) ─── */
function ProviderCard({ provider, onBook }: { provider: DemoProvider; onBook: (p: DemoProvider) => void }) {
  const [imgError, setImgError] = useState(false);
  const imgSrc = provider.imageUrl && !imgError ? provider.imageUrl : CATEGORY_IMAGE[provider.category as keyof typeof CATEGORY_IMAGE] ?? "/evigo-hero.png";

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(139,92,246,0.15)] hover:border-purple-300">
      <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
        <Image src={imgSrc} alt={provider.businessName} fill className="object-cover transition-transform duration-500 hover:scale-105"
          sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }} />
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] font-bold text-zinc-600">{provider.category}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-[15px] font-black text-zinc-900">{provider.businessName}</div>
        <div className="text-xs font-semibold text-zinc-500 mt-0.5">{provider.ownerName}</div>
        <div className="flex items-center gap-3 mt-2.5 text-xs font-bold text-zinc-500">
          <span>📍 {provider.city}</span>
          {provider.experienceYears>0 && <span>⭐ {provider.experienceYears} yrs</span>}
        </div>
        <div className="mt-2 text-[15px] font-black grad-text">
          ₹{provider.startingPrice.toLocaleString("en-IN")}+
        </div>
        {provider.description && (
          <div className="mt-2 text-xs text-zinc-500 leading-relaxed line-clamp-2">
            {provider.description}
          </div>
        )}
        <div className="flex gap-2 mt-3.5">
          <button onClick={() => onBook(provider)} className="flex-1 py-2.5 rounded-xl border-none text-[13px] font-bold text-white cursor-pointer transition-opacity hover:opacity-90" style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", boxShadow: "0 2px 10px rgba(139,92,246,0.3)" }}>
            Book Now
          </button>
          {provider.phone && (
            <a href={`tel:${provider.phone}`} className="flex-1 py-2.5 rounded-xl border border-zinc-200 bg-white text-[13px] font-bold text-zinc-600 no-underline text-center transition-colors hover:bg-zinc-50">
              📞 Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Hotel Venue Card ─── */
function HotelVenueCard({ venue }: { venue: EventVenue }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  const imgSrc = imgError ? "/evigo-hero.png" : venue.images[imgIdx];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(6,182,212,0.15)] hover:border-cyan-300">
      {/* Image with carousel dots */}
      <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
        <Image
          src={imgSrc}
          alt={venue.name}
          fill
          className="object-cover transition-all duration-500"
          sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)" }} />
        {/* Category badge */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] font-bold text-zinc-600">🏨 Restaurant</span>
          <span className="bg-cyan-500/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] font-bold text-white">✓ Verified</span>
        </div>
        {/* Rating */}
        <div className="absolute top-3 right-3">
          <span className="bg-amber-400/95 rounded-full px-2 py-0.5 text-[11px] font-black text-zinc-900">
            ★ {venue.googleRating?.toFixed(1)}
          </span>
        </div>
        {/* Image carousel dots */}
        {venue.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {venue.images.map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className="rounded-full transition-all duration-200 cursor-pointer border-none"
                style={{
                  width: i === imgIdx ? 18 : 6,
                  height: 6,
                  background: i === imgIdx ? "#fff" : "rgba(255,255,255,0.5)",
                }}
              />
            ))}
          </div>
        )}
        {/* Arrow nav */}
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center text-sm cursor-pointer border-none hover:bg-black/60 transition"
          onClick={() => setImgIdx((imgIdx - 1 + venue.images.length) % venue.images.length)}
        >‹</button>
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center text-sm cursor-pointer border-none hover:bg-black/60 transition"
          onClick={() => setImgIdx((imgIdx + 1) % venue.images.length)}
        >›</button>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="text-[15px] font-black text-zinc-900">{venue.name}</div>
        <div className="text-xs text-zinc-500 mt-0.5">
          📍 {venue.location} · {venue.reviewCount} reviews
        </div>
        {venue.description && (
          <div className="mt-2 text-xs text-zinc-500 leading-relaxed line-clamp-2">{venue.description}</div>
        )}
        {/* Safety badges */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {venue.safetyFeatures.slice(0, 2).map(f => (
            <span key={f} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ {f}
            </span>
          ))}
        </div>
        {/* Price */}
        {venue.priceRange && (
          <div className="mt-2 text-[13px] font-black" style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {venue.priceRange}
          </div>
        )}
        {/* Actions */}
        <div className="flex gap-2 mt-3.5">
          <Link
            href={`/hotels#${venue.id}`}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white no-underline text-center cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", boxShadow: "0 2px 10px rgba(139,92,246,0.3)" }}
          >
            Explore →
          </Link>
          {venue.phone && (
            <a href={`tel:${venue.phone}`} className="flex-1 py-2.5 rounded-xl border border-zinc-200 bg-white text-[13px] font-bold text-zinc-600 no-underline text-center transition-colors hover:bg-zinc-50">
              📞 Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ category }: { category: string }) {
  return (
    <div className="text-center py-12 sm:py-18 px-4">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl sm:text-5xl" style={{ background: "linear-gradient(135deg,#ede9fe,#cffafe)" }}>
        🔍
      </div>
      <div className="text-xl sm:text-2xl font-black text-zinc-900">No providers yet</div>
      <div className="text-sm text-zinc-500 max-w-xs mx-auto mt-2.5 leading-relaxed">
        {category !== "All"
          ? `No ${category} providers have listed yet. Be the first to register!`
          : "Be the first to list your service on Evigo and reach thousands of clients."}
      </div>
      <Link href="/partner">
        <button className="mt-7 px-7 py-3 rounded-xl border-none text-sm font-bold text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", boxShadow: "0 4px 20px rgba(139,92,246,0.35)" }}>
          Become a Partner →
        </button>
      </Link>
    </div>
  );
}

/* ─── Page ─── */
export default function ExplorePage() {
  const [category, setCategory] = useState<ServiceCategory | "All">("All");
  const [locationFilter, setLocationFilter] = useState("");
  const [priceBand, setPriceBand] = useState(0);
  const [providers, setProviders] = useState<DemoProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<DemoProvider | null>(null);

  useEffect(() => {
    const load = () => setProviders(getDemoProviders().filter(p => p.isActive));
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  /* ─── Filter DemoProviders ─── */
  const filteredProviders = useMemo(() => {
    const band = PRICE_BANDS[priceBand];
    return providers.filter(p => {
      if (category !== "All" && category !== "Restaurant" && p.category !== category) return false;
      if (category === "Restaurant") return false; // Hotels handle Restaurant tab
      if (locationFilter && !p.city.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (p.startingPrice < band.min || p.startingPrice >= band.max) return false;
      return true;
    });
  }, [providers, category, locationFilter, priceBand]);

  /* ─── Filter Hotels (EVENT_VENUES) ─── */
  const filteredHotels = useMemo(() => {
    const showHotels = category === "All" || category === "Restaurant";
    if (!showHotels) return [];
    const band = PRICE_BANDS[priceBand];
    return EVENT_VENUES.filter(h => {
      if (locationFilter && !h.location.toLowerCase().includes(locationFilter.toLowerCase()) && !h.city.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      const lowestPrice = parseLowestPrice(h.priceRange);
      // Hotels show in "Any Price" and "Under ₹5,000" bands (typical room rates)
      if (band.min > 0 && lowestPrice < band.min) return false;
      if (lowestPrice >= band.max) return false;
      return true;
    });
  }, [category, locationFilter, priceBand]);

  const totalResults = filteredProviders.length + filteredHotels.length;

  return (
    <main className="flex-1 pb-16 sm:pb-20">
      {/* ── Hero header ── */}
      <div className="border-b border-zinc-100 py-10 sm:py-14" style={{ background: "linear-gradient(180deg,#faf5ff 0%,#f0f9ff 50%,#fff 100%)" }}>
        <Container>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1 mb-4 sm:mb-5 text-xs sm:text-[13px] font-bold text-violet-700" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
              ✦ Real listings · No fake vendors
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-[42px] font-black leading-tight">
              <span className="grad-text">
                Explore Providers
              </span>
            </h1>
            <p className="text-sm sm:text-[15px] text-zinc-500 mt-3 max-w-md mx-auto leading-relaxed">
              Browse verified event professionals and hotel partners across Bihar. Real people, real services.
            </p>
          </div>
        </Container>
      </div>

      <Container>
        {/* ── Filter bar ── */}
        <div className="my-6 sm:my-7 bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 flex flex-wrap gap-3 sm:gap-4 items-end" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}>
          {/* Service type */}
          <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">Service Type</label>
            <select value={category} onChange={e => setCategory(e.target.value as ServiceCategory | "All")}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-[13px] font-semibold text-zinc-900 outline-none bg-zinc-50 cursor-pointer">
              <option value="All">All Services</option>
              {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">Location</label>
            <input
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              placeholder="City or district, e.g. Jamui"
              className="px-3 py-2 rounded-xl border border-zinc-200 text-[13px] font-semibold text-zinc-900 outline-none bg-zinc-50"
            />
          </div>

          {/* Price */}
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">Price Range</label>
            <select value={priceBand} onChange={e => setPriceBand(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-[13px] font-semibold text-zinc-900 outline-none bg-zinc-50 cursor-pointer">
              {PRICE_BANDS.map((b, i) => <option key={i} value={i}>{b.label}</option>)}
            </select>
          </div>

          {/* Result count */}
          <div className="text-[13px] font-bold text-zinc-500 whitespace-nowrap ml-auto">
            {totalResults} result{totalResults !== 1 ? "s" : ""}
          </div>
        </div>

        {/* ── Category pill strip ── */}
        <div className="evigo-pill-strip flex flex-wrap gap-2 mb-6 sm:mb-7">
          {(["All", ...SERVICE_CATEGORIES] as const).map((c) => {
            const active = category === c;
            return (
              <button key={c} onClick={() => setCategory(c as ServiceCategory | "All")}
                className="px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer transition-all duration-200"
                style={{ border: active ? "none" : "1px solid #e4e4e7", background: active ? "linear-gradient(135deg,#8b5cf6,#06b6d4)" : "#fff", color: active ? "#fff" : "#52525b", boxShadow: active ? "0 2px 10px rgba(139,92,246,0.3)" : "none" }}>
                {c === "Restaurant" ? "🏨 Restaurant" : c}
              </button>
            );
          })}
        </div>

        {/* ── Results: Hotel Venue Cards (when All or Restaurant selected) ── */}
        {filteredHotels.length > 0 && (
          <>
            {category === "All" && (
              <div className="mb-4 flex items-center gap-3">
                <div className="text-xs font-black text-zinc-500 uppercase tracking-widest">Hotel & Restaurant Partners</div>
                <div className="flex-1 h-px bg-zinc-100" />
              </div>
            )}
            <div className="evigo-explore-grid mb-8">
              {filteredHotels.map(h => (
                <HotelVenueCard key={h.id} venue={h} />
              ))}
            </div>
          </>
        )}

        {/* ── Results: Provider Cards ── */}
        {filteredProviders.length > 0 && (
          <>
            {category === "All" && filteredHotels.length > 0 && (
              <div className="mb-4 flex items-center gap-3">
                <div className="text-xs font-black text-zinc-500 uppercase tracking-widest">Service Providers</div>
                <div className="flex-1 h-px bg-zinc-100" />
              </div>
            )}
            <div className="evigo-explore-grid">
              {filteredProviders.map(p => (
                <ProviderCard key={p.id} provider={p} onBook={setSelectedProvider} />
              ))}
            </div>
          </>
        )}

        {/* ── Empty State ── */}
        {totalResults === 0 && <EmptyState category={category} />}
      </Container>

      <BookingModal provider={selectedProvider} onClose={() => setSelectedProvider(null)} />
    </main>
  );
}
