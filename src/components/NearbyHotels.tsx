"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import type { NearbyHotel } from "@/app/api/nearby-hotels/route";
import { resolveBiharCity, EVENT_VENUES } from "@/lib/constants";

type Status = "idle" | "requesting" | "loading" | "success" | "denied" | "error" | "no_key";

const RADIUS_OPTIONS = [
  { label: "5 km", value: 5000 },
  { label: "8 km", value: 8000 },
  { label: "10 km", value: 10000 },
  { label: "15 km", value: 15000 },
];

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null;
  const full = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5 text-amber-400 text-xs">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ opacity: i < full ? 1 : 0.3 }}>★</span>
      ))}
      <span className="text-gray-400 ml-1 font-semibold">{rating.toFixed(1)}</span>
    </span>
  );
}

function HotelCard({ hotel }: { hotel: NearbyHotel; onStreetView?: (h: NearbyHotel) => void }) {
  return (
    <div
      className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 flex flex-col"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div className="relative w-full" style={{ height: 160 }}>
        {hotel.photo_url ? (
          <Image
            src={hotel.photo_url}
            alt={hotel.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 100vw, 300px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: "rgba(139,92,246,0.1)" }}>
            🏨
          </div>
        )}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
        {hotel.distance_km !== undefined && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
            style={{ background: "rgba(6,182,212,0.85)", backdropFilter: "blur(6px)" }}>
            {hotel.distance_km} km
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="font-black text-white text-sm leading-tight line-clamp-1">{hotel.name}</div>
        <div className="text-xs text-gray-400 font-medium line-clamp-1">{hotel.vicinity}</div>
        <StarRating rating={hotel.rating} />
        {hotel.user_ratings_total && (
          <div className="text-[11px] text-gray-500">
            {hotel.user_ratings_total.toLocaleString()} reviews
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-2">
          <a
            href={hotel.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 px-3 rounded-lg text-xs font-bold text-gray-200 text-center no-underline transition-all hover:bg-white/10"
            style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)" }}
          >
            Open Maps ↗
          </a>
        </div>
      </div>
    </div>
  );
}

export function NearbyHotels() {
  const [status, setStatus] = useState<Status>("idle");
  const [hotels, setHotels] = useState<NearbyHotel[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [radius, setRadius] = useState(8000);
  const [manualQuery, setManualQuery] = useState("Jamui");

  const fetchHotels = useCallback(async (lat: number, lng: number, r: number) => {
    setStatus("loading");
    setHotels([]);
    try {
      const res = await fetch(`/api/nearby-hotels?lat=${lat}&lng=${lng}&radius=${r}`);
      const data = await res.json();
      if (data.error === "disabled" || data.error === "GOOGLE_MAPS_API_KEY not configured") {
        // Zero-cost fallback to our confirmed partner hotels
        const fallback: NearbyHotel[] = EVENT_VENUES.map((v) => ({
          place_id: v.id,
          name: v.name,
          vicinity: v.address,
          rating: v.googleRating,
          user_ratings_total: v.reviewCount,
          distance_km: 1.2,
          photo_url: v.images[0],
          street_view_url: "",
          maps_url: `/hotels#${v.id}`,
        }));
        setHotels(fallback);
        setStatus("success");
        return;
      }
      if (data.error) throw new Error(data.error);
      setHotels(data.results ?? []);
      setStatus("success");
    } catch {
      // Graceful fallback to verified hotels in Jamui
      const fallback: NearbyHotel[] = EVENT_VENUES.map((v) => ({
        place_id: v.id,
        name: v.name,
        vicinity: v.address,
        rating: v.googleRating,
        user_ratings_total: v.reviewCount,
        distance_km: 1.2,
        photo_url: v.images[0],
        street_view_url: "",
        maps_url: `/hotels#${v.id}`,
      }));
      setHotels(fallback);
      setStatus("success");
    }
  }, []);

  const handleUseLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      setStatus("error");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchHotels(pos.coords.latitude, pos.coords.longitude, radius),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
        } else {
          setErrorMsg(err.message);
          setStatus("error");
        }
      },
      { timeout: 10000 }
    );
  }, [fetchHotels, radius]);

  const handleManualSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    setStatus("loading");
    setHotels([]);

    // 1. Local resolution against Bihar cities
    const localCity = resolveBiharCity(manualQuery);
    if (localCity) {
      await fetchHotels(localCity.lat, localCity.lng, radius);
      return;
    }

    // 2. Fallback to geocoding only if Google Maps API is configured
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      try {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(manualQuery + ", Bihar, India")}&key=${apiKey}`
        );
        const geoData = await geoRes.json();
        if (geoData.status === "OK" && geoData.results?.[0]?.geometry?.location) {
          const loc = geoData.results[0].geometry.location;
          await fetchHotels(loc.lat, loc.lng, radius);
          return;
        }
      } catch {
        // ignore network geocode failure
      }
    }

    setErrorMsg(`Could not find "${manualQuery}" in Bihar. Please try searching for Jamui, Patna, Gaya, etc.`);
    setStatus("error");
  }, [manualQuery, fetchHotels, radius]);

  return (
    <div
      className="rounded-3xl p-6 sm:p-8 md:p-10"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-[13px] font-bold text-cyan-400"
            style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)" }}
          >
            📍 Verified Nearby Hotels
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            Find Hotels Near You
          </h3>
          <p className="text-sm text-gray-400 mt-2 font-medium max-w-sm">
            Discover verified hotels and stays across Jamui and Bihar.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRadius(opt.value)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border-none cursor-pointer"
              style={{
                background: radius === opt.value ? "linear-gradient(135deg,#8b5cf6,#06b6d4)" : "rgba(255,255,255,0.06)",
                color: radius === opt.value ? "#fff" : "rgba(255,255,255,0.6)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center text-center gap-4 py-2">
        <form onSubmit={handleManualSearch} className="flex gap-2 w-full max-w-md">
          <input
            type="text"
            value={manualQuery}
            onChange={(e) => setManualQuery(e.target.value)}
            placeholder="Type a city (e.g. Jamui, Patna, Gaya)..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-violet-500"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)" }}
          >
            Search
          </button>
        </form>

        <button
          onClick={handleUseLocation}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer bg-transparent border-none"
        >
          📍 Or use my current GPS location
        </button>

        {status === "error" && errorMsg && (
          <div className="text-sm text-red-400 font-semibold">{errorMsg}</div>
        )}
      </div>

      {status === "success" && hotels.length > 0 && (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {hotels.map((h) => (
            <HotelCard key={h.place_id} hotel={h} />
          ))}
        </div>
      )}
    </div>
  );
}
