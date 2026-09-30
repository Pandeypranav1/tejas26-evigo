import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server";
import { resolveTransportLocation } from "@/lib/transportLocation";
import { BIHAR_CITIES } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    const cleanLower = query.toLowerCase().replace(/[,.-]/g, " ").replace(/\s+/g, " ").trim();
    const results: { displayName: string; lat: number; lng: number; source: string }[] = [];

    // 1. Search local Bihar Cities & known landmarks
    for (const city of BIHAR_CITIES) {
      const cityNameLower = city.name.toLowerCase();
      const matchName = cityNameLower.includes(cleanLower) || cleanLower.includes(cityNameLower);
      const matchAlias = city.aliases?.some((a) => a.toLowerCase().includes(cleanLower) || cleanLower.includes(a.toLowerCase()));

      if (matchName || matchAlias) {
        results.push({
          displayName: `${city.name}, Bihar, India`,
          lat: city.lat,
          lng: city.lng,
          source: "internal",
        });
      }
    }

    // 2. If no internal matches, resolve using server-side resolver (Nominatim with server cache)
    if (results.length === 0) {
      const resolved = await resolveTransportLocation({ text: query });
      if (resolved.ok) {
        results.push({
          displayName: resolved.displayName,
          lat: resolved.lat,
          lng: resolved.lng,
          source: resolved.source,
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[GET /api/transport/search] Error:", error);
    return NextResponse.json({ success: false, error: "Search unavailable" }, { status: 500 });
  }
}
