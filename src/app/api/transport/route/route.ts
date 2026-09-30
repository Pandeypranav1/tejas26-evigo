import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/server";
import { resolveTransportLocation, type ResolvedLocation } from "@/lib/transportLocation";
import { getRoutingOptions, type RoutingResult } from "@/lib/trafficRouting";

export const runtime = "nodejs";

type CachedValue<T> = { expiresAt: number; value: T };

const CACHE_TTL = 24 * 60 * 60 * 1000;
const geocodeCache = new Map<string, CachedValue<ResolvedLocation>>();

function getCached<T>(cache: Map<string, CachedValue<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached<T>(cache: Map<string, CachedValue<T>>, key: string, value: T, ttl = CACHE_TTL) {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
}

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("booking_id");
    const pickupOverride = searchParams.get("pickup_override")?.trim();
    const dropOverride = searchParams.get("drop_override")?.trim();

    if (!bookingId) {
      return NextResponse.json({ success: false, error: "booking_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });

    const { data: provider, error: providerError } = await supabase
      .from("providers")
      .select("id")
      .eq("id", booking.provider_uuid)
      .eq("user_id", user.id)
      .maybeSingle();
    if (providerError) throw providerError;
    if (!provider) {
      return NextResponse.json({ success: false, error: "Not authorized to view this route" }, { status: 403 });
    }

    const isTransport = booking.service_type === "Transport" || !!booking.transport_service || !!booking.pickup_location;
    if (!isTransport || !["confirmed", "accepted"].includes(String(booking.status || "").toLowerCase())) {
      return NextResponse.json({ success: false, error: "A confirmed transport booking is required" }, { status: 409 });
    }

    const pickupText = pickupOverride || String(booking.pickup_location || "").trim();
    const dropText = dropOverride || String(booking.drop_location || "").trim();

    if (!pickupText) {
      return NextResponse.json({
        success: true,
        routeAvailable: false,
        stage: "geocoding",
        code: "MISSING_PICKUP",
        message: "Pickup location could not be mapped. Please verify the pickup address.",
      });
    }

    if (!dropText) {
      return NextResponse.json({
        success: true,
        routeAvailable: false,
        stage: "geocoding",
        code: "MISSING_DROP",
        message: "Destination could not be mapped. Please verify the destination.",
      });
    }

    // ── Resolve Pickup Coordinates ──
    let pickupRes: ResolvedLocation | undefined;
    if (
      !pickupOverride &&
      typeof booking.pickup_lat === "number" &&
      typeof booking.pickup_lng === "number" &&
      Number.isFinite(booking.pickup_lat) &&
      Number.isFinite(booking.pickup_lng)
    ) {
      pickupRes = {
        ok: true,
        displayName: pickupText,
        lat: booking.pickup_lat,
        lng: booking.pickup_lng,
        source: "internal",
      };
    } else {
      const cachedPickup = getCached(geocodeCache, pickupText.toLowerCase());
      if (cachedPickup) {
        pickupRes = cachedPickup;
      } else {
        pickupRes = await resolveTransportLocation({ text: pickupText });
        if (pickupRes.ok) {
          setCached(geocodeCache, pickupText.toLowerCase(), pickupRes);
        }
      }
    }

    // ── Resolve Drop Coordinates ──
    let dropRes: ResolvedLocation | undefined;
    if (
      !dropOverride &&
      typeof booking.drop_lat === "number" &&
      typeof booking.drop_lng === "number" &&
      Number.isFinite(booking.drop_lat) &&
      Number.isFinite(booking.drop_lng)
    ) {
      dropRes = {
        ok: true,
        displayName: dropText,
        lat: booking.drop_lat,
        lng: booking.drop_lng,
        source: "internal",
      };
    } else {
      const cachedDrop = getCached(geocodeCache, dropText.toLowerCase());
      if (cachedDrop) {
        dropRes = cachedDrop;
      } else {
        dropRes = await resolveTransportLocation({ text: dropText });
        if (dropRes.ok) {
          setCached(geocodeCache, dropText.toLowerCase(), dropRes);
        }
      }
    }

    if (!pickupRes || !pickupRes.ok) {
      return NextResponse.json({
        success: true,
        routeAvailable: false,
        stage: "geocoding",
        code: "PICKUP_GEOCODING_FAILED",
        message: "Pickup location could not be mapped. Please verify the pickup address.",
      });
    }

    if (!dropRes || !dropRes.ok) {
      return NextResponse.json({
        success: true,
        routeAvailable: false,
        stage: "geocoding",
        code: "DROP_GEOCODING_FAILED",
        message: "Destination could not be mapped. Please verify the destination.",
      });
    }

    const pickup = { label: pickupRes.displayName, lat: pickupRes.lat, lng: pickupRes.lng };
    const drop = { label: dropRes.displayName, lat: dropRes.lat, lng: dropRes.lng };

    // ── Request Route Options (Fastest, Shortest, Alternative, Live Traffic if configured) ──
    const routingResult: RoutingResult = await getRoutingOptions(pickup, drop);

    if (!routingResult.success || routingResult.routes.length === 0) {
      return NextResponse.json({
        success: true,
        routeAvailable: false,
        stage: "routing",
        code: "ROUTE_UNAVAILABLE",
        message: routingResult.message || "Both locations were found, but a driving route could not be calculated right now.",
        pickup,
        drop,
      });
    }

    const primaryRoute = routingResult.routes[0];

    return NextResponse.json({
      success: true,
      routeAvailable: true,
      isTrafficAware: routingResult.isTrafficAware,
      trafficProviderName: routingResult.trafficProviderName,
      pickup,
      drop,
      routes: routingResult.routes,
      // Compatibility fields for existing single-route consumers
      coordinates: primaryRoute.coordinates,
      distanceKm: primaryRoute.distanceKm,
      durationMinutes: primaryRoute.durationMinutes,
      attribution: "© OpenStreetMap contributors · Route via OSRM",
      openMapUrl: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${pickup.lat},${pickup.lng};${drop.lat},${drop.lng}`,
    });
  } catch (error) {
    console.error("[GET /api/transport/route] Error:", error);
    return NextResponse.json({ success: false, error: "Unable to prepare this trip route right now" }, { status: 500 });
  }
}