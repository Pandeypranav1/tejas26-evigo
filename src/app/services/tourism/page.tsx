"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Container } from "@/components/Container";
import { TOURISM_PLACES, TOURISM_DISTRICTS, TourismPlace } from "@/lib/constants";

// Dynamically import TourismMap with ssr: false & a sleek skeleton loader
const TourismMap = dynamic(() => import("@/components/TourismMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      <span className="text-xs text-white/50 font-semibold tracking-wider uppercase">
        Loading Interactive District Map...
      </span>
    </div>
  ),
});

// Helper to get category style tokens
function getCategoryBadge(category: string) {
  if (
    category.toLowerCase().includes("nature") ||
    category.toLowerCase().includes("wildlife") ||
    category.toLowerCase().includes("hill")
  ) {
    return {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      icon: "🌲",
    };
  }
  if (
    category.toLowerCase().includes("religious") ||
    category.toLowerCase().includes("jain") ||
    category.toLowerCase().includes("temple")
  ) {
    return {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      icon: "🛕",
    };
  }
  return {
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    text: "text-violet-400",
    icon: "🏛️",
  };
}

// Tourism Place Card without the Plan Visit button
function PlaceCard({
  place,
}: {
  place: TourismPlace;
}) {
  const catStyle = getCategoryBadge(place.category);
  const [saved, setSaved] = useState(false);

  const mapUrl =
    place.lat !== undefined && place.lng !== undefined && !isNaN(place.lat) && !isNaN(place.lng)
      ? `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${place.name}, ${place.district}, Bihar`
      )}`;

  return (
    <div className="group bg-[#0f0a1e] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_12px_40px_rgba(6,182,212,0.15)] hover:-translate-y-1">
      {/* Visual Header / Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-violet-950/40 via-[#150f28] to-[#0a0614]">
        {place.image ? (
          <>
            <Image
              src={place.image}
              alt={place.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a1e] via-[#0f0a1e]/40 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-2 backdrop-blur-md shadow-inner">
              {catStyle.icon}
            </div>
            <span className="text-xs font-semibold text-white/40 tracking-wider uppercase">
              {place.district} District
            </span>
          </div>
        )}

        {/* Category Pill Over Image */}
        <div className="absolute top-4 left-4 z-10">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border ${catStyle.bg} ${catStyle.border} ${catStyle.text}`}
          >
            <span>{catStyle.icon}</span>
            {place.category}
          </span>
        </div>

        {/* Top Right Badges & Save Bookmark Button */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
          {place.featured && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 backdrop-blur-md">
              ★ Featured
            </span>
          )}
          <button
            onClick={() => setSaved(!saved)}
            className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${saved
              ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              : "bg-black/40 border-white/10 text-white/80 hover:text-white hover:bg-black/60"
              }`}
            title={saved ? "Saved to your list" : "Bookmark place"}
            aria-label="Bookmark place"
          >
            <svg className="w-4 h-4" fill={saved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Card Content with balanced spacing */}
      <div className="p-6 flex flex-col flex-1">
        <div className="mb-2">
          <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold tracking-wide uppercase mb-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {place.district}, Bihar
          </div>
          <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
            {place.name}
          </h3>
        </div>

        <p className="text-sm text-white/70 leading-relaxed mb-5 flex-1">
          {place.description}
        </p>

        {/* Action Row: Map link */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3 mt-auto">
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold"
            title="Open in Google Maps"
          >
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Directions &rarr;</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function TourismPage() {
  const [selectedDistrict, setSelectedDistrict] = useState<string>("Jamui");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showMap, setShowMap] = useState<boolean>(true);

  const currentDistrictInfo = TOURISM_DISTRICTS.find((d) => d.id === selectedDistrict);

  // Filter places
  const districtPlaces = TOURISM_PLACES.filter((p) => p.district === selectedDistrict);
  const filteredPlaces = districtPlaces.filter((p) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "nature") {
      return (
        p.category.toLowerCase().includes("nature") ||
        p.category.toLowerCase().includes("wildlife") ||
        p.category.toLowerCase().includes("hill")
      );
    }
    if (selectedCategory === "religious") {
      return (
        p.category.toLowerCase().includes("religious") ||
        p.category.toLowerCase().includes("jain") ||
        p.category.toLowerCase().includes("temple")
      );
    }
    if (selectedCategory === "historical") {
      return (
        p.category.toLowerCase().includes("historical") ||
        p.category.toLowerCase().includes("monument")
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#05030f] text-white selection:bg-cyan-500/30 relative">
      {/* Hero Header Section */}
      <section className="relative pt-24 pb-14 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/20 via-violet-950/10 to-transparent pointer-events-none" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

        <Container>
          <div className="relative z-10 max-w-3xl">
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-cyan-400 hover:text-cyan-300 mb-6 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Services
            </Link>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-md">
                <span>🧭</span> Explore Bihar District by District
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 text-white">
              Tourism & Heritage Trails
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              Discover scenic hill stations, revered pilgrimage spots, and ancient heritage landmarks across Bihar with verified local guides and travel assistance.
            </p>
          </div>
        </Container>
      </section>

      {/* District Selector & Main Content */}
      <section className="py-10 md:py-16">
        <Container>
          {/* District Filter Chips */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <span className="text-xs font-bold tracking-wider text-white/50 uppercase">
                Select District:
              </span>
              <span className="text-xs text-white/40">
                8 Bihar districts supported
              </span>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-3 scrollbar-none">
              {TOURISM_DISTRICTS.map((dist) => {
                const isActive = selectedDistrict === dist.id;
                return (
                  <button
                    key={dist.id}
                    onClick={() => {
                      setSelectedDistrict(dist.id);
                      setSelectedCategory("all");
                    }}
                    className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 border ${isActive
                      ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]"
                      : dist.available
                        ? "bg-white/5 text-white/80 border-white/10 hover:bg-white/10 hover:text-white"
                        : "bg-white/[0.02] text-white/40 border-white/5 hover:bg-white/5 hover:text-white/60"
                      }`}
                  >
                    <span>{dist.name}</span>
                    {dist.available ? (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${isActive ? "bg-black/30 text-white" : "bg-cyan-500/20 text-cyan-300"
                          }`}
                      >
                        {dist.count}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/5 text-white/30 font-medium">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* District Header Banner */}
          {currentDistrictInfo && (
            <div className="mb-8 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-transparent border border-white/10 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2.5 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                  <span>📍</span> Currently Viewing District
                </div>
                <h2 className="text-3xl font-black text-white mb-2">
                  {currentDistrictInfo.name} District
                </h2>
                <p className="text-sm text-white/60 max-w-xl">
                  {currentDistrictInfo.tagline}
                </p>
              </div>

              {/* Category Filter Chips & Map Toggle */}
              {districtPlaces.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${selectedCategory === "all"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                      }`}
                  >
                    All ({districtPlaces.length})
                  </button>
                  <button
                    onClick={() => setSelectedCategory("nature")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${selectedCategory === "nature"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                      }`}
                  >
                    🌲 Nature & Hills
                  </button>
                  <button
                    onClick={() => setSelectedCategory("religious")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${selectedCategory === "religious"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                      }`}
                  >
                    🛕 Pilgrimage & Temples
                  </button>
                  <button
                    onClick={() => setSelectedCategory("historical")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${selectedCategory === "historical"
                      ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
                      : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                      }`}
                  >
                    🏛️ Heritage
                  </button>
                  <button
                    onClick={() => setShowMap(!showMap)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${showMap
                      ? "bg-white/15 text-white border-white/30"
                      : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                      }`}
                  >
                    <span>🗺️</span>
                    <span>{showMap ? "Hide Map" : "Show Map"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Lazy-Loaded Interactive District Map Section */}
          {districtPlaces.length > 0 && showMap && (
            <div className="mb-10 rounded-3xl overflow-hidden border border-white/15 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
              <div className="h-[380px] w-full relative">
                <TourismMap places={districtPlaces} />
              </div>
            </div>
          )}

          {/* Place Cards Grid or Coming Soon State */}
          {districtPlaces.length > 0 ? (
            <>
              {filteredPlaces.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPlaces.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-4 bg-white/5 border border-white/10 rounded-3xl">
                  <div className="text-3xl mb-3">🔍</div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    No places matching this category
                  </h3>
                  <p className="text-sm text-white/50 mb-4">
                    Try selecting another filter category above.
                  </p>
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold"
                  >
                    Show All Places
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Coming Soon State */
            <div className="py-16 md:py-24 px-6 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/10 text-center max-w-2xl mx-auto backdrop-blur-sm">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
                🗺️
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {currentDistrictInfo?.name} Trails Coming Soon
              </h3>
              <p className="text-sm text-white/60 leading-relaxed max-w-md mx-auto mb-8">
                Our team is currently surveying and verifying scenic trails, pilgrimage itineraries, and licensed local guides for {currentDistrictInfo?.name}.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setSelectedDistrict("Jamui")}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-xs font-bold transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                >
                  Explore Jamui District (8 Places)
                </button>
                <a
                  href={`https://wa.me/918809988099?text=${encodeURIComponent(
                    `Hi Evigo, I am interested in travel & guide services for ${currentDistrictInfo?.name} district.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white/20 transition-colors"
                >
                  Request Custom Guide on WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* FaabCab Transport Partner Callout */}
          <div className="mt-12 p-8 rounded-3xl bg-gradient-to-r from-amber-950/30 via-[#0d091a] to-cyan-950/30 border border-amber-500/30 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30">
                  🚗 Transport Partner
                </span>
                <span className="text-xs text-white/50 font-semibold">📍 Jamui, Bihar</span>
              </div>
              <h3 className="text-3xl font-black text-white mb-2">
                FaabCab
              </h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Need inter-city travel, airport transfers, station pickup, or hourly cab rentals for your Bihar tour? Book directly with Evigo’s official transport partner.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/travel-tourism/faabcab"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-cyan-500 to-violet-600 text-white font-bold text-sm hover:scale-105 shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all flex items-center gap-2"
              >
                <span>Explore FaabCab</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>

        </Container>
      </section>
    </div>
  );
}
