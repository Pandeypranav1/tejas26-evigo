import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const FAABCAB_PROVIDER_UUID = "6105241d-1d38-4274-b912-eea67f4c32b0";

const FAABCAB_SERVICE_MAP: Record<string, string> = {
  "inter-city": "414956e0-95ad-4740-9914-4333c3be21e0",
  "Inter-city One Way / Round Trip": "414956e0-95ad-4740-9914-4333c3be21e0",
  "local-rental": "b72bf79e-3b1d-4af6-b326-a0f7940f1901",
  "Local Hourly Rental": "b72bf79e-3b1d-4af6-b326-a0f7940f1901",
  "airport-transfer": "9303c9f1-3e06-4c6e-bfdc-9423c681e03b",
  "Airport Transfer": "9303c9f1-3e06-4c6e-bfdc-9423c681e03b",
  "railway-pickup": "6d2f50bd-6183-4b6e-8ca4-8e34a5c1fd26",
  "Railway Pickup & Drop": "6d2f50bd-6183-4b6e-8ca4-8e34a5c1fd26",
};

function isValidUuid(str: any): boolean {
  if (typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("provider_id");
    const clientId = searchParams.get("client_id");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");

    const supabase = getSupabaseClient();
    let query = supabase.from("bookings").select("*").order("created_at", { ascending: false });

    if (providerId) {
      if (providerId === "faab-cab" || providerId === FAABCAB_PROVIDER_UUID) {
        query = query.or(`provider_id.eq.faab-cab,provider_uuid.eq.${FAABCAB_PROVIDER_UUID}`);
      } else {
        query = query.eq("provider_id", providerId);
      }
    } else if (clientId) {
      query = query.eq("client_id", clientId);
    } else if (email) {
      query = query.eq("customer_email", email);
    } else if (phone) {
      query = query.eq("customer_phone", phone);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[GET /api/bookings] Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookings: data || [] });
  } catch (err: any) {
    console.error("[GET /api/bookings] Error:", err);
    return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      client_id,
      provider_id,
      provider_uuid,
      service_id,
      service_type,
      provider_name,
      event_date,
      event_time,
      guest_count,
      customer_name,
      customer_phone,
      customer_email,
      city,
      message,
      // Transport specific fields
      pickup_location,
      drop_location,
      travel_date,
      pickup_time,
      passenger_count,
      transport_service,
      special_request,
    } = body;

    const isTransport = service_type === "Transport" || !!transport_service || !!pickup_location;
    const effectiveCustomerName = customer_name;
    const effectiveCustomerPhone = customer_phone;
    const effectiveServiceType = service_type || transport_service || "Transport";
    const effectiveEventDate = event_date || travel_date || null;
    const effectiveEventTime = event_time || pickup_time || null;
    const effectiveGuestCount = guest_count || passenger_count || null;
    const effectiveProviderId = provider_id || "faab-cab";
    const effectiveProviderName = provider_name || (effectiveProviderId === "faab-cab" ? "FaabCab" : "Provider");

    // Map exact provider_uuid and service_id for FaabCab
    const sanitizedProviderUuid = isValidUuid(provider_uuid)
      ? provider_uuid
      : (effectiveProviderId === "faab-cab" ? FAABCAB_PROVIDER_UUID : null);

    const targetServiceKey = service_id || transport_service;
    const sanitizedServiceId = isValidUuid(service_id)
      ? service_id
      : (FAABCAB_SERVICE_MAP[targetServiceKey] || FAABCAB_SERVICE_MAP["inter-city"]);

    if (
      !effectiveCustomerName ||
      !effectiveCustomerPhone ||
      !effectiveServiceType ||
      !(effectiveEventDate || travel_date)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Required booking details (Name, Phone, Service, Date) are missing.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const generatedId = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const bookingPayload: Record<string, any> = {
      client_id: client_id || null,
      provider_id: effectiveProviderId,
      provider_uuid: sanitizedProviderUuid,
      service_id: sanitizedServiceId,
      service_type: effectiveServiceType,
      provider_name: effectiveProviderName,
      customer_name: effectiveCustomerName,
      customer_phone: effectiveCustomerPhone,
      customer_email: customer_email || null,
      city: city || "Jamui, Bihar",
      status: "pending",
      // Keep message strictly for special requests/notes
      message: isTransport ? (special_request || message || null) : (message || null),
    };

    if (isTransport) {
      bookingPayload.pickup_location = pickup_location || null;
      bookingPayload.drop_location = drop_location || null;
      bookingPayload.transport_service = transport_service || effectiveServiceType;
      bookingPayload.travel_date = travel_date || effectiveEventDate;
      bookingPayload.pickup_time = pickup_time || effectiveEventTime;
      bookingPayload.passenger_count = passenger_count ? Number(passenger_count) : (effectiveGuestCount ? Number(effectiveGuestCount) : null);

      // Synced fields for fallback table views
      bookingPayload.event_date = travel_date || effectiveEventDate;
      bookingPayload.event_time = pickup_time || effectiveEventTime;
      bookingPayload.guest_count = passenger_count ? Number(passenger_count) : effectiveGuestCount;
    } else {
      bookingPayload.event_date = effectiveEventDate;
      bookingPayload.event_time = effectiveEventTime;
      bookingPayload.guest_count = effectiveGuestCount;
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert(bookingPayload)
      .select()
      .single();

    if (error) {
      console.error("Booking insert error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Booking created successfully.",
        booking: data || {
          id: generatedId,
          ...bookingPayload,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Booking API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong while creating the booking.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    if (!id || !["pending", "accepted", "rejected"].includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid booking ID or status" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);

    if (error) {
      console.error("Booking update error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Status updated successfully" });
  } catch (err: any) {
    console.error("Booking PATCH error:", err);
    return NextResponse.json({ success: false, error: "Failed to update booking status" }, { status: 500 });
  }
}