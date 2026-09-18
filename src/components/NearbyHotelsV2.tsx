"use client";

/**
 * NearbyHotelsV2 — Zero-cost "Find Hotels Near You"
 *
 * Cost: ₹0. No API keys needed.
 *
 * How it works:
 *   1. User shares GPS OR searches any Bihar city (text search or dropdown).
 *   2. Instant local resolution using resolveBiharCity / Haversine distance.
 *   3. Displays verified partners within radius on Leaflet map + card grid.
 */

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  HOTEL_PARTNERS,
  BIHAR_CITIES,
  haversineKm,
  resolveBiharCity,
  type HotelPartner,
} from "@/lib/constants";

// LeafletMap dynamically imported with ssr:false to prevent Next.js SSR window errors
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-2xl animate-pulse"
      style={{ height: 320, background: "rgba(255,255,255,0.05)" }}
    />
  ),
});

type PartnerWithDist = HotelPartner & { distanceKm: number };
type Status = "idle" | "requesting" | "success" | "denied" | "error";
type SearchMode = "city" | "gps";

const RADIUS_OPTIONS = [
  { label: "5 km",  value: 5  },
  { label: "8 km",  value: 8  },
  { label: "15 km", value: 15 },
  { label: "30 km", value: 30 },
];

const CATEGORY_EMOJI: Record<HotelPartner["category"], string> = {
  hotel:      "🏨",
  restaurant: "🍽️",
  homestay:   "🏡",
  resort:     "🏖️",
};

function PartnerCard({
  partner,
  onViewPhotos,
}: {
  partner: PartnerWithDist;
  onViewPhotos: (p: PartnerWithDist) => void;
  onFocus: (p: PartnerWithDist) => void;
}) {
  const thumb = partner.photos[0];
  const emoji = CATEGORY_EMOJI[partner.category] || "🏨";

  return (
    <div
      className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 flex flex-col"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Thumbnail */}
      <div className="relative w-full overflow-hidden" style={{ height: 160 }}>
        {thumb ? (
          <Image
            src={thumb}
            alt={partner.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 100vw, 300px"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-5xl"
            style={{ background: "rgba(139,92,246,0.08)" }}
          >
            {emoji}
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)" }}
        />
        {/* Distance badge */}
        <div
          className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
          style={{ background: "rgba(6,182,212,0.9)", backdropFilter: "blur(6px)" }}
        >
          {partner.distanceKm < 1 ? "< 1 km" : `${partner.distanceKm.toFixed(1)} km`}
        </div>
        {/* Verified badge */}
        <div
          className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white"
          style={{ background: "rgba(139,92,246,0.9)", backdropFilter: "blur(6px)" }}
        >
          ✓ Evigo Partner
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <div className="font-black text-white text-sm leading-tight line-clamp-1">
          {emoji} {partner.name}
        </div>
        <div className="text-xs text-gray-400 font-medium line-clamp-1">
          📍 {partner.address}, {partner.city}
        </div>
        {partner.priceRange && (
          <div className="text-xs font-bold text-cyan-400 mt-0.5">{partner.priceRange}</div>
        )}
        {partner.description && (
          <div className="text-[11px] text-gray-400 leading-relaxed line-clamp-2 mt-1">
            {partner.description}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-3">
          {partner.photos.length > 0 && (
            <button
              onClick={() => onViewPhotos(partner)}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white transition-all duration-200 hover:opacity-90 cursor-pointer border-none"
              style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)" }}
            >
              🖼️ Photos ({partner.photos.length})
            </button>
          )}
          {partner.phone && (
            <a
              href={`tel:${partner.phone}`}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-gray-200 text-center no-underline transition-colors hover:bg-white/10"
              style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)" }}
            >
              📞 Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoLightbox({
  partner,
  onClose,
}: {
  partner: PartnerWithDist;
  onClose: () => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = partner.photos;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.15)", background: "#09090b" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          <div>
            <div className="text-white font-black text-base">
              {CATEGORY_EMOJI[partner.category] || "🏨"} {partner.name}
            </div>
            <div className="text-gray-400 text-xs mt-0.5">
              {partner.address}, {partner.city}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition border-none cursor-pointer"
            style={{ background: "rgba(255,255,255,0.05)" }}
            aria-label="Close photo viewer"
          >
            ✕
          </button>
        </div>

        <div className="relative" style={{ height: 380 }}>
          <Image
            src={photos[photoIdx]}
            alt={`${partner.name} — photo ${photoIdx + 1}`}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 672px"
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white transition hover:bg-black/60 border-none cursor-pointer"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                ‹
              </button>
              <button
                onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white transition hover:bg-black/60 border-none cursor-pointer"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                ›
              </button>
            </>
          )}
          {photos.length > 1 && (
            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold text-white"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            >
              {photoIdx + 1} / {photos.length}
            </div>
          )}
        </div>

        {photos.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {photos.map((src, i) => (
              <button
                key={i}
                onClick={() => setPhotoIdx(i)}
                className="relative shrink-0 rounded-lg overflow-hidden transition-all duration-200 border-none cursor-pointer p-0"
                style={{
                  width: 64,
                  height: 48,
                  border: i === photoIdx ? "2px solid #8b5cf6" : "2px solid transparent",
                }}
              >
                <Image src={src} alt="" fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        )}

        <div
          className="px-5 py-3 text-center text-[11px] text-gray-500 border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          ✓ Evigo Verified Partner &mdash; verified photos from property
        </div>
      </div>
    </div>
  );
}

export function NearbyHotelsV2() {
  const [status, setStatus]             = useState<Status>("idle");
  const [errorMsg, setErrorMsg]         = useState("");
  const [radiusKm, setRadiusKm]         = useState(15);
  const [searchMode, setSearchMode]     = useState<SearchMode>("city");
  const [cityInput, setCityInput]       = useState("Jamui");
  const [results, setResults]           = useState<PartnerWithDist[]>([]);
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [lightboxPartner, setLightboxPartner] = useState<PartnerWithDist | null>(null);
  const cachedGpsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Core search — pure client-side Haversine against HOTEL_PARTNERS
  const runSearch = useCallback((originLat: number, originLng: number, r: number, label?: string) => {
    setErrorMsg("");
    setOriginCoords({ lat: originLat, lng: originLng, label });
    const matched: PartnerWithDist[] = HOTEL_PARTNERS
      .map((p) => ({ ...p, distanceKm: haversineKm(originLat, originLng, p.lat, p.lng) }))
      .filter((p) => p.distanceKm <= r)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    setResults(matched);
    setStatus("success");
  }, []);

  // Execute search by text or city name
  const executeCitySearch = useCallback((query: string, r: number = radiusKm) => {
    if (!query.trim()) {
      setErrorMsg("Please enter a city or district name.");
      setStatus("error");
      return;
    }

    const cityMatch = resolveBiharCity(query);
    if (cityMatch) {
      runSearch(cityMatch.lat, cityMatch.lng, r, cityMatch.name);
    } else {
      setErrorMsg(`Could not find "${query}" in our Bihar directory. Try searching for Jamui, Patna, Gaya, Rajgir, or Munger.`);
      setStatus("error");
    }
  }, [radiusKm, runSearch]);

  const handleUseLocation = useCallback(() => {
    if (cachedGpsRef.current) {
      runSearch(cachedGpsRef.current.lat, cachedGpsRef.current.lng, radiusKm, "Current Location");
      return;
    }
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser. Please search by city name.");
      setStatus("error");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedGpsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        runSearch(pos.coords.latitude, pos.coords.longitude, radiusKm, "Current Location");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
        } else {
          setErrorMsg(err.message || "Failed to retrieve GPS location.");
          setStatus("error");
        }
      },
      { timeout: 10000 },
    );
  }, [runSearch, radiusKm]);

  // handleReset resets back to idle — no auto-search on mount so the map
  // and result cards only appear after the user actively triggers a search.

  const handleReset = useCallback(() => {
    setStatus("idle");
    setResults([]);
    setOriginCoords(null);
  }, []);

  return (
    <>
      <div
        className="rounded-3xl p-6 sm:p-8 md:p-10 w-full"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-[13px] font-bold text-cyan-400"
              style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)" }}
            >
              📍 Evigo Verified Hotels & Stays
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              Find Hotels Near You
            </h3>
            <p className="text-sm text-gray-400 mt-2 font-medium max-w-md">
              Search verified partner hotels in Jamui and across Bihar using city name or live GPS.
            </p>
          </div>

          {/* Radius selector */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setRadiusKm(opt.value);
                  if (originCoords) {
                    runSearch(originCoords.lat, originCoords.lng, opt.value, originCoords.label);
                  }
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border-none cursor-pointer"
                style={{
                  background: radiusKm === opt.value
                    ? "linear-gradient(135deg,#8b5cf6,#06b6d4)"
                    : "rgba(255,255,255,0.08)",
                  color: radiusKm === opt.value ? "#fff" : "rgba(255,255,255,0.7)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar & Controls */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Mode Switcher */}
          <div className="flex items-center gap-3">
            <div
              className="inline-flex rounded-xl overflow-hidden p-1"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <button
                onClick={() => setSearchMode("city")}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border-none cursor-pointer"
                style={{
                  background: searchMode === "city" ? "linear-gradient(135deg,#8b5cf6,#06b6d4)" : "transparent",
                  color: searchMode === "city" ? "#fff" : "rgba(255,255,255,0.6)",
                }}
              >
                🏙️ Search City
              </button>
              <button
                onClick={() => {
                  setSearchMode("gps");
                  handleUseLocation();
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border-none cursor-pointer"
                style={{
                  background: searchMode === "gps" ? "linear-gradient(135deg,#8b5cf6,#06b6d4)" : "transparent",
                  color: searchMode === "gps" ? "#fff" : "rgba(255,255,255,0.6)",
                }}
              >
                📍 Use My GPS
              </button>
            </div>

            {/* Quick Jamui button */}
            <button
              onClick={() => {
                setCityInput("Jamui");
                executeCitySearch("Jamui");
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/20 cursor-pointer border"
              style={{ background: "rgba(6,182,212,0.1)", borderColor: "rgba(6,182,212,0.25)" }}
            >
              🎯 Show Jamui ({HOTEL_PARTNERS.length} Hotels)
            </button>
          </div>

          {/* City search input & select */}
          {searchMode === "city" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeCitySearch(cityInput);
              }}
              className="flex flex-col sm:flex-row gap-2.5 w-full max-w-xl"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="Type city or district (e.g. Jamui, Patna, Gaya)..."
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-violet-500"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                  }}
                />
              </div>

              {/* City quick dropdown */}
              <select
                value={BIHAR_CITIES.some(c => c.name.toLowerCase() === cityInput.toLowerCase()) ? cityInput : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setCityInput(e.target.value);
                    executeCitySearch(e.target.value);
                  }
                }}
                className="px-3 py-3 rounded-xl text-sm font-medium text-white outline-none cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                <option value="" disabled style={{ background: "#18181b" }}>Select City...</option>
                {BIHAR_CITIES.map((c) => (
                  <option key={c.name} value={c.name} style={{ background: "#18181b" }}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 cursor-pointer border-none"
                style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", boxShadow: "0 2px 12px rgba(139,92,246,0.3)" }}
              >
                Search
              </button>
            </form>
          )}

          {/* Feedback messages */}
          {status === "requesting" && (
            <div className="text-sm text-cyan-400 font-semibold flex items-center gap-2">
              <span className="animate-spin">🌀</span> Requesting GPS position from your browser...
            </div>
          )}
          {status === "denied" && (
            <div className="text-sm text-amber-400 font-semibold">
              Location access denied by browser. Type &quot;Jamui&quot; or select a city from the list above.
            </div>
          )}
          {status === "error" && errorMsg && (
            <div className="text-sm text-red-400 font-semibold">{errorMsg}</div>
          )}
        </div>

        {/* Idle prompt — shown before any search has been performed */}
        {status === "idle" && (
          <div className="flex flex-col items-center justify-center gap-4 py-14 px-6 rounded-2xl text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)" }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}
            >
              🗺️
            </div>
            <div>
              <p className="text-white font-bold text-base mb-1">Find Verified Hotels Near You</p>
              <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                Select a city or use your GPS location to discover verified partner hotels nearby.
              </p>
            </div>
            <button
              onClick={() => {
                setCityInput("Jamui");
                executeCitySearch("Jamui");
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white border-none cursor-pointer transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", boxShadow: "0 2px 12px rgba(139,92,246,0.3)" }}
            >
              🎯 Quick Start: Show Jamui Hotels
            </button>
          </div>
        )}

        {/* Results view — only shown after a successful search */}
        {status === "success" && originCoords && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="text-sm font-bold text-gray-300">
                Found <span className="text-cyan-400 font-black">{results.length} verified partner{results.length !== 1 ? "s" : ""}</span> within {radiusKm} km of <span className="text-white font-black">{originCoords.label || "selected location"}</span>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-gray-400 hover:text-white transition cursor-pointer border-none bg-transparent"
              >
                Clear Search ✕
              </button>
            </div>

            {/* Interactive Leaflet Map */}
            <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 320 }}>
              <LeafletMap
                userLat={originCoords.lat}
                userLng={originCoords.lng}
                partners={results}
                onMarkerClick={(p) => setLightboxPartner(p as PartnerWithDist)}
              />
            </div>

            {/* Partner Cards Grid */}
            {results.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {results.map((partner) => (
                  <PartnerCard
                    key={partner.id}
                    partner={partner}
                    onViewPhotos={(p) => setLightboxPartner(p)}
                    onFocus={() => {}}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white/[0.02] rounded-2xl border border-white/5 p-6">
                <div className="text-3xl mb-2">🏨</div>
                <div className="text-white font-bold text-base">No verified partners within {radiusKm} km</div>
                <p className="text-gray-400 text-xs max-w-sm mx-auto mt-1 leading-relaxed">
                  We currently have verified partner hotels in Jamui. Increase your search radius to 30 km or search for &quot;Jamui&quot;.
                </p>
                <button
                  onClick={() => {
                    setCityInput("Jamui");
                    executeCitySearch("Jamui", 30);
                  }}
                  className="mt-4 px-5 py-2 rounded-xl text-xs font-bold text-white border-none cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)" }}
                >
                  View Jamui Hotels →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPartner && (
        <PhotoLightbox
          partner={lightboxPartner}
          onClose={() => setLightboxPartner(null)}
        />
      )}
    </>
  );
}
