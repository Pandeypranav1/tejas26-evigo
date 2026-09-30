import { resolveTransportLocation } from "./transportLocation";

export type RouteStep = {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  name?: string;
};

export type RouteOption = {
  id: string;
  label: "Fastest" | "Shortest" | "Alternative";
  isTrafficAware: boolean;
  distanceKm: number;
  durationMinutes: number;
  trafficDelayMinutes?: number;
  trafficCongestion?: "Low" | "Moderate" | "Heavy";
  coordinates: [number, number][]; // [lng, lat]
  steps: RouteStep[];
};

export type RoutingResult = {
  success: boolean;
  isTrafficAware: boolean;
  trafficProviderName?: string;
  routes: RouteOption[];
  message?: string;
};

/**
 * Clean Server-Side Traffic Routing Abstraction
 */
export async function getRoutingOptions(
  pickup: { lat: number; lng: number },
  drop: { lat: number; lng: number }
): Promise<RoutingResult> {
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  // ── Option 1: Mapbox Traffic-Aware Provider ──
  if (mapboxToken) {
    try {
      const result = await fetchMapboxTrafficRoute(pickup, drop, mapboxToken);
      if (result.success && result.routes.length > 0) {
        return result;
      }
    } catch (err) {
      console.warn("[getRoutingOptions] Mapbox traffic routing error, falling back to OSRM:", err);
    }
  }

  // ── Option 2: Google Routes Traffic-Aware Provider ──
  if (googleApiKey) {
    try {
      const result = await fetchGoogleTrafficRoute(pickup, drop, googleApiKey);
      if (result.success && result.routes.length > 0) {
        return result;
      }
    } catch (err) {
      console.warn("[getRoutingOptions] Google traffic routing error, falling back to OSRM:", err);
    }
  }

  // ── Option 3: Default OSRM Fallback (No live traffic data) ──
  return await fetchOSRMRoute(pickup, drop);
}

/**
 * Fetch routes from OSRM engine with alternatives & steps
 */
async function fetchOSRMRoute(
  pickup: { lat: number; lng: number },
  drop: { lat: number; lng: number }
): Promise<RoutingResult> {
  const coordinates = `${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}`;
  const url = new URL(`https://router.project-osrm.org/route/v1/driving/${coordinates}`);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "true");
  url.searchParams.set("alternatives", "true");

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return {
        success: false,
        isTrafficAware: false,
        routes: [],
        message: `Routing engine HTTP status ${response.status}`,
      };
    }

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return {
        success: false,
        isTrafficAware: false,
        routes: [],
        message: "No drivable route found between these locations.",
      };
    }

    const rawRoutes: any[] = data.routes;
    const parsedRoutes: RouteOption[] = rawRoutes
      .map((r, index) => {
        const distanceKm = Number(r.distance) / 1000;
        const durationMinutes = Number(r.duration) / 60;
        const coords = (r.geometry?.coordinates || []) as [number, number][];
        
        const steps: RouteStep[] = (r.legs?.[0]?.steps || []).map((s: any) => {
          const type = s.maneuver?.type || "continue";
          const modifier = s.maneuver?.modifier ? ` ${s.maneuver.modifier}` : "";
          const name = s.name ? ` onto ${s.name}` : "";
          const instruction = `${type}${modifier}${name}`.trim();
          return {
            instruction: instruction.charAt(0).toUpperCase() + instruction.slice(1),
            distanceMeters: Math.round(s.distance || 0),
            durationSeconds: Math.round(s.duration || 0),
            name: s.name || undefined,
          };
        });

        return {
          id: `osrm-route-${index}`,
          label: "Alternative" as const,
          isTrafficAware: false,
          distanceKm,
          durationMinutes,
          coordinates: coords,
          steps,
        };
      })
      .filter((r) => r.coordinates.length > 0 && r.distanceKm > 0 && r.durationMinutes > 0);

    if (parsedRoutes.length === 0) {
      return {
        success: false,
        isTrafficAware: false,
        routes: [],
        message: "No valid route geometry returned.",
      };
    }

    // Classify Fastest and Shortest accurately based on metrics
    let minDurationIndex = 0;
    let minDistanceIndex = 0;

    parsedRoutes.forEach((r, idx) => {
      if (r.durationMinutes < parsedRoutes[minDurationIndex].durationMinutes) {
        minDurationIndex = idx;
      }
      if (r.distanceKm < parsedRoutes[minDistanceIndex].distanceKm) {
        minDistanceIndex = idx;
      }
    });

    parsedRoutes[minDurationIndex].label = "Fastest";
    if (minDistanceIndex !== minDurationIndex) {
      parsedRoutes[minDistanceIndex].label = "Shortest";
    }

    return {
      success: true,
      isTrafficAware: false,
      routes: parsedRoutes,
    };
  } catch (err: any) {
    return {
      success: false,
      isTrafficAware: false,
      routes: [],
      message: err?.message || "Failed to query OSRM routing service.",
    };
  }
}

/**
 * Mapbox Directions API with live driving-traffic (if MAPBOX_ACCESS_TOKEN is provided)
 */
async function fetchMapboxTrafficRoute(
  pickup: { lat: number; lng: number },
  drop: { lat: number; lng: number },
  token: string
): Promise<RoutingResult> {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?alternatives=true&geometries=geojson&steps=true&access_token=${token}`;

  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Mapbox status ${response.status}`);
  const data = await response.json();

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("Mapbox returned no valid routes");
  }

  const routes: RouteOption[] = data.routes.map((r: any, idx: number) => {
    const distanceKm = r.distance / 1000;
    const durationMinutes = r.duration / 60;
    const durationTypical = r.duration_typical ? r.duration_typical / 60 : durationMinutes;
    const delay = Math.max(0, Math.round(durationMinutes - durationTypical));
    
    let congestion: "Low" | "Moderate" | "Heavy" = "Low";
    if (delay > 10) congestion = "Heavy";
    else if (delay > 3) congestion = "Moderate";

    return {
      id: `mapbox-route-${idx}`,
      label: idx === 0 ? "Fastest" : "Alternative",
      isTrafficAware: true,
      distanceKm,
      durationMinutes,
      trafficDelayMinutes: delay,
      trafficCongestion: congestion,
      coordinates: r.geometry.coordinates as [number, number][],
      steps: (r.legs?.[0]?.steps || []).map((s: any) => ({
        instruction: s.maneuver?.instruction || "Continue along route",
        distanceMeters: Math.round(s.distance || 0),
        durationSeconds: Math.round(s.duration || 0),
        name: s.name || undefined,
      })),
    };
  });

  return {
    success: true,
    isTrafficAware: true,
    trafficProviderName: "Mapbox Traffic",
    routes,
  };
}

/**
 * Google Routes API with TRAFFIC_AWARE (if GOOGLE_MAPS_API_KEY is provided)
 */
async function fetchGoogleTrafficRoute(
  pickup: { lat: number; lng: number },
  drop: { lat: number; lng: number },
  key: string
): Promise<RoutingResult> {
  const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.geoJsonLinestring,routes.legs.steps",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: pickup.lat, longitude: pickup.lng } } },
      destination: { location: { latLng: { latitude: drop.lat, longitude: drop.lng } } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: true,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error(`Google Routes status ${response.status}`);
  const data = await response.json();

  if (!data.routes?.length) throw new Error("Google Routes returned no routes");

  const routes: RouteOption[] = data.routes.map((r: any, idx: number) => {
    const distMeters = Number(r.distanceMeters || 0);
    const durSec = parseInt(r.duration || "0", 10);
    const staticDurSec = parseInt(r.staticDuration || "0", 10) || durSec;
    const delayMin = Math.max(0, Math.round((durSec - staticDurSec) / 60));

    let congestion: "Low" | "Moderate" | "Heavy" = "Low";
    if (delayMin > 10) congestion = "Heavy";
    else if (delayMin > 3) congestion = "Moderate";

    return {
      id: `google-route-${idx}`,
      label: idx === 0 ? "Fastest" : "Alternative",
      isTrafficAware: true,
      distanceKm: distMeters / 1000,
      durationMinutes: durSec / 60,
      trafficDelayMinutes: delayMin,
      trafficCongestion: congestion,
      coordinates: r.polyline?.geoJsonLinestring?.coordinates || [],
      steps: [],
    };
  });

  return {
    success: true,
    isTrafficAware: true,
    trafficProviderName: "Google Routes (Traffic-Aware)",
    routes,
  };
}
