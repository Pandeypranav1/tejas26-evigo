import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAG — set to false to re-enable Google Places + Street View search
// (Option 1 from the implementation plan). Requires a valid GOOGLE_MAPS_API_KEY
// in .env.local and billing enabled in Google Cloud Console with budget alerts set.
// ─────────────────────────────────────────────────────────────────────────────
const NEARBY_HOTELS_GOOGLE_DISABLED = true;

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

export interface NearbyHotel {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  distance_km?: number;
  photo_url?: string;
  street_view_url: string;
  maps_url: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  // ── Option 3 active: return a clear disabled signal ──
  if (NEARBY_HOTELS_GOOGLE_DISABLED) {
    return NextResponse.json(
      {
        error: "disabled",
        message:
          "Google-powered nearby search is disabled. " +
          "The app is using Evigo's zero-cost verified partner search instead. " +
          "To re-enable: set NEARBY_HOTELS_GOOGLE_DISABLED=false in route.ts and " +
          "add a billing-enabled GOOGLE_MAPS_API_KEY to .env.local.",
      },
      { status: 503 },
    );
  }

  // ── Option 1 code preserved below — uncomment flag above to re-activate ──

  if (!API_KEY) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "NaN");
  const lng = parseFloat(searchParams.get("lng") ?? "NaN");
  const radiusM = Math.min(15000, Math.max(1000, parseInt(searchParams.get("radius") ?? "8000", 10)));

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  const placesUrl = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  placesUrl.searchParams.set("location", `${lat},${lng}`);
  placesUrl.searchParams.set("radius", String(radiusM));
  placesUrl.searchParams.set("type", "lodging");
  placesUrl.searchParams.set("key", API_KEY);

  try {
    const res = await fetch(placesUrl.toString(), { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Places API returned ${res.status}`);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json({ error: data.status, message: data.error_message }, { status: 502 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: NearbyHotel[] = (data.results ?? []).slice(0, 12).map((place: any) => {
      const placeLat: number = place.geometry?.location?.lat ?? lat;
      const placeLng: number = place.geometry?.location?.lng ?? lng;
      const photoRef: string | undefined = place.photos?.[0]?.photo_reference;
      const photo_url = photoRef
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${API_KEY}`
        : undefined;

      return {
        place_id: place.place_id,
        name: place.name,
        vicinity: place.vicinity,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        distance_km: Math.round(haversineKm(lat, lng, placeLat, placeLng) * 10) / 10,
        photo_url,
        street_view_url: `https://www.google.com/maps/embed/v1/streetview?key=${API_KEY}&location=${placeLat},${placeLng}&heading=235&pitch=10&fov=90`,
        maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[nearby-hotels]", err);
    return NextResponse.json({ error: "Failed to fetch nearby hotels" }, { status: 500 });
  }
}
