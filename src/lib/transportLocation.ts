import { BIHAR_CITIES } from "./constants";

export type LocationRequest = {
  text: string;
  context?: {
    country?: string;
    state?: string;
    district?: string;
  };
};

export type ResolvedLocation =
  | {
      ok: true;
      displayName: string;
      lat: number;
      lng: number;
      source: "internal" | "nominatim";
    }
  | {
      ok: false;
      stage: "normalization" | "geocoding";
      reason: string;
    };

// Known verified transport locations registry (internal high-confidence fallback)
const KNOWN_LOCATIONS: Record<string, { displayName: string; lat: number; lng: number }> = {
  "patna": { displayName: "Patna, Bihar, India", lat: 25.5941, lng: 85.1376 },
  "patna city": { displayName: "Patna City, Patna, Bihar, India", lat: 25.6083, lng: 85.1764 },
  "patna junction": { displayName: "Patna Junction Railway Station, Patna, Bihar, India", lat: 25.6022, lng: 85.1373 },
  "gaya": { displayName: "Gaya, Bihar, India", lat: 24.7955, lng: 85.0002 },
  "bodh gaya": { displayName: "Bodh Gaya, Bihar, India", lat: 24.6961, lng: 84.9911 },
  "samastipur": { displayName: "Samastipur, Bihar, India", lat: 25.8614, lng: 85.7795 },
  "muzaffarpur": { displayName: "Muzaffarpur, Bihar, India", lat: 26.1197, lng: 85.3910 },
  "jamui": { displayName: "Jamui, Bihar, India", lat: 24.9278, lng: 86.2265 },
  "gec jamui": { displayName: "Government Engineering College Jamui, Bihar, India", lat: 24.9664, lng: 86.2057 },
  "government engineering college jamui": { displayName: "Government Engineering College Jamui, Bihar, India", lat: 24.9664, lng: 86.2057 },
  "deoghar": { displayName: "Deoghar, Jharkhand, India", lat: 24.4826, lng: 86.6974 },
  "bhagalpur": { displayName: "Bhagalpur, Bihar, India", lat: 25.2425, lng: 86.9842 },
  "darbhanga": { displayName: "Darbhanga, Bihar, India", lat: 26.1542, lng: 85.8918 },
  "rajgir": { displayName: "Rajgir, Bihar, India", lat: 25.0303, lng: 85.4182 },
  "nalanda": { displayName: "Nalanda, Bihar, India", lat: 25.1359, lng: 85.4442 },
  "munger": { displayName: "Munger, Bihar, India", lat: 25.3743, lng: 86.4730 },
  "begusarai": { displayName: "Begusarai, Bihar, India", lat: 25.4182, lng: 86.1272 },
};

/**
 * Normalizes user input location string for geocoding queries.
 */
export function normalizeLocationText(rawText: string): string {
  if (!rawText || !rawText.trim()) return "";
  let clean = rawText.trim().replace(/\s+/g, " ");

  const lower = clean.toLowerCase();
  
  // Specific landmark normalizations
  if (lower === "patna junction" || lower === "patna jn" || lower === "patna station") {
    return "Patna Junction, Patna, Bihar, India";
  }

  // Check if state/country is already present
  const hasIndia = lower.includes("india") || lower.includes("in");
  const hasState = lower.includes("bihar") || lower.includes("jharkhand") || lower.includes("up") || lower.includes("uttar pradesh");

  if (!hasState && !hasIndia) {
    return `${clean}, Bihar, India`;
  } else if (!hasIndia) {
    return `${clean}, India`;
  }

  return clean;
}

/**
 * Single Central Location Resolution Layer
 */
export async function resolveTransportLocation(req: LocationRequest): Promise<ResolvedLocation> {
  const rawText = req.text?.trim();
  if (!rawText) {
    return {
      ok: false,
      stage: "normalization",
      reason: "Location input text is empty.",
    };
  }

  const cleanLower = rawText.toLowerCase().replace(/[,.-]/g, " ").replace(/\s+/g, " ").trim();

  // 1. Try Internal Verified Registry
  if (KNOWN_LOCATIONS[cleanLower]) {
    const loc = KNOWN_LOCATIONS[cleanLower];
    return {
      ok: true,
      displayName: loc.displayName,
      lat: loc.lat,
      lng: loc.lng,
      source: "internal",
    };
  }

  // 2. Try Bihar Cities fuzzy lookup from BIHAR_CITIES
  for (const city of BIHAR_CITIES) {
    const cityNameLower = city.name.toLowerCase();
    if (cleanLower === cityNameLower || city.aliases?.some((a) => a.toLowerCase() === cleanLower)) {
      return {
        ok: true,
        displayName: `${city.name}, Bihar, India`,
        lat: city.lat,
        lng: city.lng,
        source: "internal",
      };
    }
  }

  // Substring match for Bihar cities
  for (const city of BIHAR_CITIES) {
    const cityNameLower = city.name.toLowerCase();
    if (cleanLower.includes(cityNameLower)) {
      return {
        ok: true,
        displayName: `${city.name}, Bihar, India`,
        lat: city.lat,
        lng: city.lng,
        source: "internal",
      };
    }
  }

  // 3. Nominatim External Geocoding Fallback
  const query = normalizeLocationText(rawText);
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1"); // CRITICAL FIX: required to get address details!
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "in");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Evigo/1.0 (+https://evigo.in; transport route resolver)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return {
        ok: false,
        stage: "geocoding",
        reason: `Geocoding provider returned status ${response.status}`,
      };
    }

    const data = (await response.json()) as any[];
    if (!data || data.length === 0) {
      return {
        ok: false,
        stage: "geocoding",
        reason: `No geographic coordinates found for location: ${rawText}`,
      };
    }

    const match = data[0];
    const lat = Number(match.lat);
    const lng = Number(match.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return {
        ok: false,
        stage: "geocoding",
        reason: "Invalid coordinates received from geocoding provider.",
      };
    }

    return {
      ok: true,
      displayName: match.display_name || query,
      lat,
      lng,
      source: "nominatim",
    };
  } catch (err: any) {
    return {
      ok: false,
      stage: "geocoding",
      reason: err?.message || "Geocoding request failed.",
    };
  }
}
