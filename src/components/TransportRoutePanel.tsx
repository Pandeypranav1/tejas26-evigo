"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

type RouteStep = {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  name?: string;
};

type RouteOption = {
  id: string;
  label: "Fastest" | "Shortest" | "Alternative";
  isTrafficAware: boolean;
  distanceKm: number;
  durationMinutes: number;
  trafficDelayMinutes?: number;
  trafficCongestion?: "Low" | "Moderate" | "Heavy";
  coordinates: [number, number][];
  steps: RouteStep[];
};

type RouteCoordinates = { lat: number; lng: number; label: string };

type RouteResponse = {
  success: boolean;
  routeAvailable: boolean;
  isTrafficAware: boolean;
  trafficProviderName?: string;
  stage?: "geocoding" | "routing";
  code?: string;
  message?: string;
  pickup?: RouteCoordinates;
  drop?: RouteCoordinates;
  routes?: RouteOption[];
  coordinates?: [number, number][];
  distanceKm?: number;
  durationMinutes?: number;
  attribution?: string;
  openMapUrl?: string;
};

type Booking = {
  id: string;
  pickup_location?: string | null;
  drop_location?: string | null;
};

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[300px] items-center justify-center bg-zinc-900 text-xs font-bold text-zinc-400">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <span>Loading Leaflet route map...</span>
      </div>
    </div>
  ),
});

const QUICK_BIHAR_SUGGESTIONS = [
  "Patna",
  "Gaya",
  "Jamui",
  "Muzaffarpur",
  "Samastipur",
  "Patna Junction",
  "GEC JAMUI",
];

function formatDuration(minutes: number): string {
  const roundedMinutes = Math.round(minutes);
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;
  if (hours > 0) {
    return `${hours} hr ${remainingMinutes} min`;
  }
  return `${roundedMinutes} min`;
}

export function TransportRoutePanel({ booking }: { booking: Booking }) {
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Overrides & Planning State
  const [pickupInput, setPickupInput] = useState(booking.pickup_location || "");
  const [dropInput, setDropInput] = useState(booking.drop_location || "");
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [showTurnByTurn, setShowTurnByTurn] = useState<boolean>(false);

  // Map Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ displayName: string; lat: number; lng: number }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMarker, setSearchMarker] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // Rate Limiting / Debouncing
  const [lastRecalculatedAt, setLastRecalculatedAt] = useState<number>(0);

  const fetchRoute = useCallback(
    async (overrideP?: string, overrideD?: string) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ booking_id: booking.id });
      if (overrideP) params.set("pickup_override", overrideP);
      if (overrideD) params.set("drop_override", overrideD);

      try {
        const res = await fetch(`/api/transport/route?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Unable to load trip route.");
        }
        setRouteData(data as RouteResponse);
        setSelectedRouteIndex(0); // Reset to fastest route
      } catch (err: any) {
        setError(err.message || "Failed to retrieve route details.");
      } finally {
        setLoading(false);
      }
    },
    [booking.id]
  );

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  // Recalculate Route with 2-second rate limit
  const handleRecalculate = () => {
    const now = Date.now();
    if (now - lastRecalculatedAt < 2000) return; // Debounce
    setLastRecalculatedAt(now);
    fetchRoute(pickupInput !== booking.pickup_location ? pickupInput : undefined, dropInput !== booking.drop_location ? dropInput : undefined);
  };

  // Swap Locations for planning
  const handleSwapLocations = () => {
    const newP = dropInput;
    const newD = pickupInput;
    setPickupInput(newP);
    setDropInput(newD);
    fetchRoute(newP, newD);
  };

  // Server-Side Search for Map Location
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/transport/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.results) && data.results.length > 0) {
        setSearchResults(data.results);
        const top = data.results[0];
        setSearchMarker({ lat: top.lat, lng: top.lng, label: top.displayName });
      } else {
        setSearchResults([]);
        alert(`No coordinates found for "${searchQuery}"`);
      }
    } catch (err) {
      console.warn("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (res: { displayName: string; lat: number; lng: number }) => {
    setSearchMarker({ lat: res.lat, lng: res.lng, label: res.displayName });
    setSearchResults([]);
  };

  const activeRoute = routeData?.routes?.[selectedRouteIndex] || (routeData?.coordinates ? {
    id: "primary",
    label: "Fastest" as const,
    isTrafficAware: routeData.isTrafficAware,
    distanceKm: routeData.distanceKm || 0,
    durationMinutes: routeData.durationMinutes || 0,
    coordinates: routeData.coordinates,
    steps: [],
  } : null);

  const canRenderMap = Boolean(routeData?.pickup && routeData?.drop);

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-emerald-500/30 bg-[#0a0f1d] text-white p-4 sm:p-5 shadow-2xl">
      {/* ── Driver Console Top Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
              🚗 CONFIRMED TRIP
            </span>
            <span className="text-xs text-white/50">Driver Navigation Console</span>
          </div>
          <h4 className="mt-1 text-lg font-black text-white">Route Planning & Live Navigation</h4>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition-all disabled:opacity-50"
          >
            <span>🔄</span>
            <span>{loading ? "Calculating..." : "Recalculate"}</span>
          </button>

          {routeData?.openMapUrl && (
            <a
              href={routeData.openMapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all"
            >
              <span>Open Full Map</span>
              <span>↗</span>
            </a>
          )}
        </div>
      </div>

      {/* ── Map Search Bar ── */}
      <div className="my-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔎 Search location on map (e.g. Patna Junction, Gaya, GEC Jamui)..."
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-cyan-400 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition-colors disabled:opacity-50"
          >
            {isSearching ? "Searching..." : "Locate"}
          </button>
        </form>

        {/* Quick Location Suggestion Pills */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-white/40 font-bold">Quick Locate:</span>
          {QUICK_BIHAR_SUGGESTIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => {
                setSearchQuery(loc);
                fetch(`/api/transport/search?q=${encodeURIComponent(loc)}`)
                  .then((res) => res.json())
                  .then((d) => {
                    if (d.results?.[0]) handleSelectSearchResult(d.results[0]);
                  });
              }}
              className="rounded-md bg-white/10 px-2 py-0.5 font-medium text-cyan-200 hover:bg-white/20 transition-colors"
            >
              {loc}
            </button>
          ))}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 rounded-lg border border-cyan-500/30 bg-[#0f172a] p-2 text-xs space-y-1">
            <div className="text-[10px] font-bold uppercase text-cyan-400">Search Matches:</div>
            {searchResults.map((res, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSearchResult(res)}
                className="w-full text-left p-1.5 rounded hover:bg-cyan-950/50 text-white truncate block font-medium"
              >
                📍 {res.displayName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Pickup & Destination Planning Controls + Swap ── */}
      <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 space-y-2 w-full">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">📍 Pickup:</span>
              <input
                type="text"
                value={pickupInput}
                onChange={(e) => setPickupInput(e.target.value)}
                className="flex-1 rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-rose-400 font-bold">🏁 Drop:</span>
              <input
                type="text"
                value={dropInput}
                onChange={(e) => setDropInput(e.target.value)}
                className="flex-1 rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-xs text-white outline-none focus:border-rose-400"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSwapLocations}
            className="px-3 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all shrink-0 flex sm:flex-col items-center gap-1"
            title="Swap Pickup & Destination for planning"
          >
            <span>🔄</span>
            <span>Swap</span>
          </button>
        </div>
      </div>

      {/* ── Traffic Status Banner (Rule: NEVER show fake traffic) ── */}
      <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 flex items-center justify-between text-xs">
        {routeData?.isTrafficAware ? (
          <div className="flex items-center gap-2 text-amber-300">
            <span className="text-base">🚥</span>
            <div>
              <span className="font-bold">{routeData.trafficProviderName || "Live Traffic Data Active"}</span>
              {activeRoute?.trafficDelayMinutes !== undefined && activeRoute.trafficDelayMinutes > 0 && (
                <span className="ml-2 font-black text-rose-400">+{activeRoute.trafficDelayMinutes} min delay</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-white/60">
            <span className="text-base">ℹ️</span>
            <div>
              <span className="font-bold text-white/80">Live traffic data unavailable</span>
              <span className="ml-1 text-[11px] text-white/50">(Routes based on road-network geometry)</span>
            </div>
          </div>
        )}

        <span className="text-[10px] font-mono text-white/40 uppercase">OSRM Engine</span>
      </div>

      {/* ── Route Options Cards (Fastest, Shortest, Alternative) ── */}
      {routeData?.routes && routeData.routes.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold uppercase text-white/60 mb-2">Available Driving Routes ({routeData.routes.length})</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {routeData.routes.map((rt, idx) => {
              const isSelected = selectedRouteIndex === idx;
              const badgeBg = rt.label === "Fastest" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : rt.label === "Shortest" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-white/10 text-white/70 border-white/20";
              const icon = rt.label === "Fastest" ? "⚡" : rt.label === "Shortest" ? "📏" : "🔄";

              return (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => setSelectedRouteIndex(idx)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-emerald-950/40 border-emerald-400 shadow-lg shadow-emerald-500/10 scale-[1.02]"
                      : "bg-white/[0.03] border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                      {icon} {rt.label}
                    </span>
                    {isSelected && <span className="text-[10px] font-bold text-emerald-400">✓ Selected</span>}
                  </div>
                  <div className="text-base font-black text-white mt-1">{rt.distanceKm.toFixed(1)} km</div>
                  <div className="text-xs font-bold text-emerald-300">{formatDuration(rt.durationMinutes)}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Loading / Error Messages ── */}
      {loading && (
        <div className="my-6 flex items-center justify-center gap-2 py-6 text-xs font-semibold text-emerald-300">
          <div className="h-4 w-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <span>Calculating optimal driving route...</span>
        </div>
      )}

      {error && (
        <div className="my-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-semibold text-rose-200">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && routeData && !routeData.routeAvailable && routeData.message && (
        <div className="my-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-semibold text-amber-200">
          ℹ️ {routeData.message}
        </div>
      )}

      {/* ── Interactive Leaflet Map ── */}
      {canRenderMap && routeData?.pickup && routeData?.drop && (
        <>
          <div className="relative mt-2 h-[300px] sm:h-[380px] w-full overflow-hidden rounded-xl border border-white/15 shadow-inner">
            <LeafletMap
              key={`${booking.id}-${selectedRouteIndex}`}
              userLat={routeData.pickup.lat}
              userLng={routeData.pickup.lng}
              originLabel={pickupInput || routeData.pickup.label}
              destination={{ lat: routeData.drop.lat, lng: routeData.drop.lng, label: dropInput || routeData.drop.label }}
              routeCoordinates={activeRoute?.coordinates}
              alternativeRoutes={routeData.routes?.map((r) => ({ id: r.id, coordinates: r.coordinates }))}
              selectedRouteIndex={selectedRouteIndex}
              searchMarker={searchMarker}
            />
          </div>

          {/* ── Selected Route Summary Box ── */}
          {activeRoute && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-400/80 block">Selected Route</span>
                <span className="text-sm font-extrabold text-white">{activeRoute.label}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-400/80 block">Distance</span>
                <span className="text-base font-black text-white">{activeRoute.distanceKm.toFixed(1)} km</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase text-emerald-400/80 block">Est. Drive Time</span>
                <span className="text-base font-black text-emerald-300">{formatDuration(activeRoute.durationMinutes)}</span>
              </div>
            </div>
          )}

          {/* ── Turn-by-Turn Collapsible Directions ── */}
          {activeRoute?.steps && activeRoute.steps.length > 0 && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setShowTurnByTurn(!showTurnByTurn)}
                className="w-full p-3 text-left text-xs font-bold text-emerald-300 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
              >
                <span>Turn-by-turn directions ({activeRoute.steps.length} steps)</span>
                <span>{showTurnByTurn ? "▲ Hide" : "▼ Show"}</span>
              </button>

              {showTurnByTurn && (
                <div className="p-3 border-t border-white/10 space-y-2 text-xs text-white/80 max-h-60 overflow-y-auto">
                  {activeRoute.steps.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-2 border-b border-white/5 pb-1.5 last:border-0">
                      <span className="font-mono text-cyan-400 shrink-0 font-bold">{sIdx + 1}.</span>
                      <div className="flex-1">
                        <span>{step.instruction}</span>
                        {step.distanceMeters > 0 && (
                          <span className="ml-2 text-[10px] text-white/40 font-mono">({(step.distanceMeters / 1000).toFixed(1)} km)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {routeData.attribution && (
            <p className="mt-3 text-[10px] text-white/40 text-center">{routeData.attribution}</p>
          )}
        </>
      )}
    </section>
  );
}