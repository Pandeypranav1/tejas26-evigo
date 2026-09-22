import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    if (providerId) query = query.eq("provider_id", providerId);
    else if (clientId) query = query.eq("client_id", clientId);
    else if (email) query = query.eq("customer_email", email);
    else if (phone) query = query.eq("customer_phone", phone);

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

    const effectiveCustomerName = customer_name;
    const effectiveCustomerPhone = customer_phone;
    const effectiveServiceType = service_type || transport_service || "Transport";
    const effectiveEventDate = event_date || travel_date;
    const effectiveEventTime = event_time || pickup_time || null;
    const effectiveGuestCount = guest_count || passenger_count || null;
    const effectiveProviderId = provider_id || "faab-cab";
    const effectiveProviderName = provider_name || (effectiveProviderId === "faab-cab" ? "FaabCab" : "Provider");

    if (
      !effectiveCustomerName ||
      !effectiveCustomerPhone ||
      !effectiveServiceType ||
      !effectiveEventDate
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Required booking details (Name, Phone, Service, Date) are missing.",
        },
        { status: 400 }
      );
    }

    // Build rich structured message for transport journeys
    let structuredMessage = message || special_request || "";
    if (pickup_location || drop_location) {
      const details = [
        pickup_location ? `Pickup: ${pickup_location}` : null,
        drop_location ? `Drop: ${drop_location}` : null,
        transport_service ? `Service: ${transport_service}` : null,
        passenger_count ? `Passengers: ${passenger_count}` : null,
        special_request ? `Notes: ${special_request}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      structuredMessage = details;
    }

    const supabase = getSupabaseClient();
    const generatedId = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const { error } = await supabase
      .from("bookings")
      .insert({
        client_id: client_id || null,
        provider_id: effectiveProviderId,
        service_type: effectiveServiceType,
        provider_name: effectiveProviderName,
        event_date: effectiveEventDate,
        event_time: effectiveEventTime,
        guest_count: effectiveGuestCount,
        customer_name: effectiveCustomerName,
        customer_phone: effectiveCustomerPhone,
        customer_email: customer_email || null,
        city: city || "Jamui, Bihar",
        message: structuredMessage || null,
        status: "pending",
      });

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
        booking: {
          id: generatedId,
          provider_id: effectiveProviderId,
          service_type: effectiveServiceType,
          customer_name: effectiveCustomerName,
          customer_phone: effectiveCustomerPhone,
          customer_email: customer_email || null,
          event_date: effectiveEventDate,
          message: structuredMessage,
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