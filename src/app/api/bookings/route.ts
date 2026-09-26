import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendNewBookingEmailToProvider,
  sendBookingAcceptedEmailToClient,
  sendBookingRejectedEmailToClient,
  sendBookingCancelledEmailToProvider,
} from "@/lib/email";
import { createNotificationServer } from "@/lib/notifications";

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
    const providerUuid = searchParams.get("provider_uuid");
    const clientId = searchParams.get("client_id");
    const userId = searchParams.get("user_id");
    const role = searchParams.get("role");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");

    const supabase = getSupabaseClient();
    let query = supabase.from("bookings").select("*").order("created_at", { ascending: false });

    if (role === "provider" || providerId || providerUuid || (userId && !clientId)) {
      const activeUserId = userId;
      let targetProviderUuids: string[] = [];

      if (activeUserId) {
        // Query providers owned by this user
        const { data: myProviders } = await supabase
          .from("providers")
          .select("id")
          .eq("user_id", activeUserId);

        if (myProviders && myProviders.length > 0) {
          targetProviderUuids = myProviders.map((p) => p.id);
        }
      }

      if (providerUuid && !targetProviderUuids.includes(providerUuid)) {
        targetProviderUuids.push(providerUuid);
      }

      // If user manages FaabCab or providerId is faab-cab
      const isFaabCab = providerId === "faab-cab" || providerId === FAABCAB_PROVIDER_UUID;
      if (isFaabCab || targetProviderUuids.includes(FAABCAB_PROVIDER_UUID)) {
        if (!targetProviderUuids.includes(FAABCAB_PROVIDER_UUID)) {
          targetProviderUuids.push(FAABCAB_PROVIDER_UUID);
        }
        // Match either faab-cab or FaabCab UUID
        query = query.or(`provider_id.eq.faab-cab,provider_uuid.in.(${targetProviderUuids.join(",")})`);
      } else if (targetProviderUuids.length > 0) {
        query = query.in("provider_uuid", targetProviderUuids);
      } else if (providerId) {
        query = query.eq("provider_id", providerId);
      }
    } else if (clientId) {
      if (email) {
        query = query.or(`client_id.eq.${clientId},customer_email.eq.${email}`);
      } else {
        query = query.eq("client_id", clientId);
      }
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
    const effectiveCustomerName = customer_name?.trim();
    const effectiveCustomerPhone = customer_phone?.trim();
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

    // Booking payload: structured columns preserved, message strictly for special requests
    const bookingPayload: Record<string, any> = {
      client_id: client_id || null,
      provider_id: effectiveProviderId,
      provider_uuid: sanitizedProviderUuid,
      service_id: sanitizedServiceId,
      service_type: effectiveServiceType,
      provider_name: effectiveProviderName,
      customer_name: effectiveCustomerName,
      customer_phone: effectiveCustomerPhone,
      customer_email: customer_email?.trim() || null,
      city: city || "Jamui, Bihar",
      status: "pending",
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

    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert(bookingPayload)
      .select()
      .single();

    if (insertError) {
      console.error("[POST /api/bookings] Insert error:", insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    // ── Notifications & Email Triggering ──
    try {
      // Find owning provider record to obtain user_id and email
      let providerUserId: string | null = null;
      let providerEmail: string | null = null;

      if (sanitizedProviderUuid) {
        const { data: provRow } = await supabase
          .from("providers")
          .select("id, user_id, business_name")
          .eq("id", sanitizedProviderUuid)
          .maybeSingle();

        if (provRow?.user_id) {
          providerUserId = provRow.user_id;
        }
      }

      // If user_id found, get provider email from profiles
      if (providerUserId) {
        const { data: profRow } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", providerUserId)
          .maybeSingle();

        if (profRow?.email) {
          providerEmail = profRow.email;
        }
      }

      // 1. Create In-App Notification for Provider
      if (providerUserId) {
        await createNotificationServer({
          userId: providerUserId,
          bookingId: booking.id,
          title: "New Booking Request 🚀",
          message: `New ${effectiveServiceType} booking from ${effectiveCustomerName} for ${bookingPayload.event_date}`,
          type: "booking_new",
        });
      }

      // 2. Send Server-Side Brevo Email to Provider
      if (providerEmail) {
        await sendNewBookingEmailToProvider({
          providerEmail,
          providerName: effectiveProviderName,
          bookingId: booking.id,
          customerName: effectiveCustomerName,
          customerPhone: effectiveCustomerPhone,
          customerEmail: customer_email || null,
          service: effectiveServiceType,
          date: bookingPayload.event_date || "Not specified",
          time: bookingPayload.event_time || null,
          pickup: bookingPayload.pickup_location,
          destination: bookingPayload.drop_location,
          passengers: bookingPayload.passenger_count,
          specialRequest: bookingPayload.message,
        });
      }
    } catch (notifyErr) {
      console.warn("[POST /api/bookings] Notification/Email warning (booking still succeeded):", notifyErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Booking created successfully.",
        booking,
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
    const body = await request.json();
    const { id, status, rejection_reason, action, client_id, user_id } = body;

    const targetStatus = status || (action === "cancel" ? "cancelled" : null);

    if (!id || !["pending", "confirmed", "rejected", "cancelled", "completed"].includes(targetStatus)) {
      return NextResponse.json(
        { success: false, error: "Invalid booking ID or status" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Fetch existing booking
    const { data: existingBooking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existingBooking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    const updates: Record<string, any> = {
      status: targetStatus,
    };

    // ── Acceptance ──
    if (targetStatus === "confirmed") {
      updates.provider_response_at = new Date().toISOString();
    }

    // ── Rejection ──
    if (targetStatus === "rejected") {
      if (!rejection_reason || !rejection_reason.trim()) {
        return NextResponse.json(
          { success: false, error: "Rejection reason is required" },
          { status: 400 }
        );
      }
      updates.rejection_reason = rejection_reason.trim();
      updates.provider_response_at = new Date().toISOString();
    }

    // ── Client Cancellation ──
    if (targetStatus === "cancelled") {
      // Do not allow cancellation of completed or rejected bookings
      if (existingBooking.status === "completed") {
        return NextResponse.json(
          { success: false, error: "Completed bookings cannot be cancelled" },
          { status: 400 }
        );
      }
      if (existingBooking.status === "rejected") {
        return NextResponse.json(
          { success: false, error: "Rejected bookings cannot be cancelled" },
          { status: 400 }
        );
      }
      updates.cancelled_at = new Date().toISOString();
    }

    const { data: updatedBooking, error: updateErr } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      console.error("[PATCH /api/bookings] Update error:", updateErr);
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }

    // ── Handle Notifications & Brevo Emails Server-Side ──
    try {
      const clientUserId = existingBooking.client_id;
      const clientEmail = existingBooking.customer_email;
      const clientName = existingBooking.customer_name || "Customer";

      // 1. Acceptance Flow -> Notify Client
      if (targetStatus === "confirmed") {
        if (clientUserId) {
          await createNotificationServer({
            userId: clientUserId,
            bookingId: id,
            title: "Booking Confirmed! 🎉",
            message: `Your booking for ${existingBooking.service_type || existingBooking.transport_service} has been confirmed by ${existingBooking.provider_name}.`,
            type: "booking_confirmed",
          });
        }
        if (clientEmail) {
          await sendBookingAcceptedEmailToClient({
            clientEmail,
            clientName,
            bookingId: id,
            providerName: existingBooking.provider_name || "Service Provider",
            service: existingBooking.transport_service || existingBooking.service_type,
            date: existingBooking.travel_date || existingBooking.event_date || "Scheduled Date",
            time: existingBooking.pickup_time || existingBooking.event_time,
          });
        }
      }

      // 2. Rejection Flow -> Notify Client with Reason
      if (targetStatus === "rejected") {
        if (clientUserId) {
          await createNotificationServer({
            userId: clientUserId,
            bookingId: id,
            title: "Booking Request Update",
            message: `Your booking for ${existingBooking.service_type || existingBooking.transport_service} was declined. Reason: ${updates.rejection_reason}`,
            type: "booking_rejected",
          });
        }
        if (clientEmail) {
          await sendBookingRejectedEmailToClient({
            clientEmail,
            clientName,
            bookingId: id,
            providerName: existingBooking.provider_name || "Service Provider",
            service: existingBooking.transport_service || existingBooking.service_type,
            reason: updates.rejection_reason,
          });
        }
      }

      // 3. Client Cancellation Flow -> Notify Provider
      if (targetStatus === "cancelled") {
        // Find provider's user_id and email
        let providerUserId: string | null = null;
        let providerEmail: string | null = null;

        if (existingBooking.provider_uuid) {
          const { data: provRow } = await supabase
            .from("providers")
            .select("user_id")
            .eq("id", existingBooking.provider_uuid)
            .maybeSingle();
          if (provRow?.user_id) providerUserId = provRow.user_id;
        }

        if (providerUserId) {
          const { data: profRow } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", providerUserId)
            .maybeSingle();
          if (profRow?.email) providerEmail = profRow.email;

          await createNotificationServer({
            userId: providerUserId,
            bookingId: id,
            title: "Booking Cancelled by Customer",
            message: `Booking #${id.slice(-6)} has been cancelled by ${clientName}.`,
            type: "booking_cancelled",
          });
        }

        if (providerEmail) {
          await sendBookingCancelledEmailToProvider({
            providerEmail,
            providerName: existingBooking.provider_name || "Provider",
            bookingId: id,
            customerName: clientName,
            service: existingBooking.transport_service || existingBooking.service_type,
            date: existingBooking.travel_date || existingBooking.event_date || "Scheduled Date",
          });
        }
      }

      // 4. Completed Flow -> Notify Client
      if (targetStatus === "completed") {
        if (clientUserId) {
          await createNotificationServer({
            userId: clientUserId,
            bookingId: id,
            title: "Booking Completed ✅",
            message: `Your booking #${id.slice(-6)} with ${existingBooking.provider_name} is complete. Thank you for using Evigo!`,
            type: "booking_completed",
          });
        }
      }
    } catch (notifyErr) {
      console.warn("[PATCH /api/bookings] Notification/email processing warning:", notifyErr);
    }

    return NextResponse.json({
      success: true,
      message: `Booking status updated to ${targetStatus}`,
      booking: updatedBooking,
    });
  } catch (err: any) {
    console.error("[PATCH /api/bookings] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update booking status" },
      { status: 500 }
    );
  }
}