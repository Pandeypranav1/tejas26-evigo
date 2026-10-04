import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendNewBookingEmailToProvider,
  sendBookingAcceptedEmailToClient,
  sendBookingRejectedEmailToClient,
  sendBookingCancelledEmailToProvider,
} from "@/lib/email";
import { createNotificationServer } from "@/lib/notifications";
import { getAuthenticatedUser } from "@/lib/server";

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
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("provider_id");
    const providerUuid = searchParams.get("provider_uuid");
    const clientId = searchParams.get("client_id");
    const userId = searchParams.get("user_id");
    const role = searchParams.get("role");
    const email = searchParams.get("email");
    const supabase = getSupabaseClient();
    let query = supabase.from("bookings").select("*").order("created_at", { ascending: false });

    if (role === "provider" || providerId || providerUuid || (userId && !clientId)) {
      if (userId && userId !== user.id) {
        return NextResponse.json({ success: false, error: "Not authorized to view these bookings" }, { status: 403 });
      }

      const { data: myProviders, error: providersError } = await supabase
        .from("providers")
        .select("id")
        .eq("user_id", user.id);
      if (providersError) throw providersError;

      const ownedProviderIds = (myProviders || []).map((provider) => provider.id);
      if (providerUuid && !ownedProviderIds.includes(providerUuid)) {
        return NextResponse.json({ success: false, error: "Not authorized to view these bookings" }, { status: 403 });
      }

      const isFaabCab = providerId === "faab-cab" || providerId === FAABCAB_PROVIDER_UUID;
      if (isFaabCab && !ownedProviderIds.includes(FAABCAB_PROVIDER_UUID)) {
        return NextResponse.json({ success: false, error: "Not authorized to view FaabCab bookings" }, { status: 403 });
      }

      const providerIds = providerUuid ? [providerUuid] : ownedProviderIds;
      if (providerIds.length === 0) {
        return NextResponse.json({ success: true, bookings: [] });
      }
      query = isFaabCab
        ? query.or(`provider_id.eq.faab-cab,provider_uuid.in.(${providerIds.join(",")})`)
        : query.in("provider_uuid", providerIds);
    } else {
      if (clientId && clientId !== user.id) {
        return NextResponse.json({ success: false, error: "Not authorized to view these bookings" }, { status: 403 });
      }
      if (email && email.toLowerCase() !== (user.email || "").toLowerCase()) {
        return NextResponse.json({ success: false, error: "Not authorized to view these bookings" }, { status: 403 });
      }
      query = email
        ? query.or(`client_id.eq.${user.id},customer_email.eq.${user.email}`)
        : query.eq("client_id", user.id);
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
    const { user } = await getAuthenticatedUser();

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

    if (client_id && (!user || client_id !== user.id)) {
      return NextResponse.json({ success: false, error: "The signed-in user does not match this booking" }, { status: 403 });
    }

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

    // Idempotency check: prevent duplicate booking creation
    // Check for existing booking with same customer, service, and date in non-terminal state
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("*")
      .eq("customer_phone", effectiveCustomerPhone)
      .eq("service_type", effectiveServiceType)
      .eq("travel_date", travel_date || effectiveEventDate)
      .in("status", ["pending", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingBooking) {
      console.log("[POST /api/bookings] Returning existing booking to prevent duplicate:", existingBooking.id);
      return NextResponse.json(
        {
          success: true,
          message: "Booking already exists for this request",
          booking: existingBooking,
          is_existing: true,
        },
        { status: 200 }
      );
    }

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

      // Attempt server-side coordinate pre-resolution for pickup & drop
      if (pickup_location && drop_location) {
        try {
          const { resolveTransportLocation } = await import("@/lib/transportLocation");
          const pickupRes = await resolveTransportLocation({ text: pickup_location });
          const dropRes = await resolveTransportLocation({ text: drop_location });
          if (pickupRes.ok) {
            bookingPayload.pickup_lat = pickupRes.lat;
            bookingPayload.pickup_lng = pickupRes.lng;
          }
          if (dropRes.ok) {
            bookingPayload.drop_lat = dropRes.lat;
            bookingPayload.drop_lng = dropRes.lng;
          }
        } catch (resolveErr) {
          console.warn("[POST /api/bookings] Geocoding pre-resolution warning:", resolveErr);
        }
      }
    } else {
      bookingPayload.event_date = effectiveEventDate;
      bookingPayload.event_time = effectiveEventTime;
      bookingPayload.guest_count = effectiveGuestCount;
    }

    let booking: any = null;
    let insertError: any = null;

    const firstInsert = await supabase
      .from("bookings")
      .insert(bookingPayload)
      .select()
      .single();

    if (firstInsert.error && (bookingPayload.pickup_lat !== undefined || bookingPayload.drop_lat !== undefined)) {
      // If error caused by unmigrated DB columns, strip coordinates and retry insert safely
      delete bookingPayload.pickup_lat;
      delete bookingPayload.pickup_lng;
      delete bookingPayload.drop_lat;
      delete bookingPayload.drop_lng;

      const secondInsert = await supabase
        .from("bookings")
        .insert(bookingPayload)
        .select()
        .single();
      booking = secondInsert.data;
      insertError = secondInsert.error;
    } else {
      booking = firstInsert.data;
      insertError = firstInsert.error;
    }

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
        const { data: provRow, error: provError } = await supabase
          .from("providers")
          .select("id, user_id, business_name")
          .eq("id", sanitizedProviderUuid)
          .maybeSingle();

        if (provError) {
          console.error("[POST /api/bookings] Error fetching provider:", provError);
        } else if (provRow?.user_id) {
          providerUserId = provRow.user_id;
          console.log("[POST /api/bookings] Found provider user_id:", providerUserId);
        } else {
          console.warn("[POST /api/bookings] Provider UUID found but no user_id:", sanitizedProviderUuid);
        }
      } else {
        console.warn("[POST /api/bookings] No provider_uuid available for notification");
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

      // Only send notification if we have a valid provider user_id
      if (!providerUserId) {
        console.error("[POST /api/bookings] Cannot send notification - no provider user_id found");
      }

      // 1. Create In-App Notification for Provider
      if (providerUserId) {
        try {
          await createNotificationServer({
            userId: providerUserId,
            bookingId: booking.id,
            title: isTransport ? "🚗 New Transport Booking" : "New Booking Request",
            message: isTransport
              ? [
                `Customer: ${booking.customer_name || effectiveCustomerName}`,
                `Pickup: ${booking.pickup_location || "Not provided"}`,
                `Drop: ${booking.drop_location || "Not provided"}`,
                `Date: ${booking.travel_date || "Not provided"}`,
                `Time: ${booking.pickup_time || "Not provided"}`,
                `Passengers: ${booking.passenger_count ?? "Not provided"}`,
                `Service: ${booking.transport_service || effectiveServiceType}`,
              ].join("\n")
              : `New ${effectiveServiceType} booking from ${effectiveCustomerName} for ${bookingPayload.event_date}`,
            type: "booking_new",
          });
          console.log("[POST /api/bookings] Notification sent to provider:", providerUserId);
        } catch (notifErr) {
          console.error("[POST /api/bookings] Failed to create notification:", notifErr);
        }
      }

      // 2. Send Server-Side Brevo Email to Provider
      if (providerEmail) {
        try {
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
          console.log("[POST /api/bookings] Email sent to provider:", providerEmail);
        } catch (emailErr) {
          console.error("[POST /api/bookings] Failed to send email:", emailErr);
        }
      }
    } catch (notifyErr) {
      console.error("[POST /api/bookings] Notification/Email error (booking still succeeded):", notifyErr);
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
    const { id, status, rejection_reason, action } = body;
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

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

    const providerAction = ["confirmed", "rejected", "completed"].includes(targetStatus);
    if (providerAction) {
      const { data: myProviders, error: providerError } = await supabase
        .from("providers")
        .select("id")
        .eq("user_id", user.id);
      if (providerError) throw providerError;

      const ownedProviderIds = (myProviders || []).map((provider) => provider.id);
      const isFaabCabBooking = existingBooking.provider_id === "faab-cab" || existingBooking.provider_uuid === FAABCAB_PROVIDER_UUID;
      const isAuthorizedProvider =
        (existingBooking.provider_uuid && ownedProviderIds.includes(existingBooking.provider_uuid)) ||
        (isFaabCabBooking && (ownedProviderIds.includes(FAABCAB_PROVIDER_UUID) || ownedProviderIds.length > 0)) ||
        ownedProviderIds.length > 0;

      if (!isAuthorizedProvider) {
        return NextResponse.json({ success: false, error: "Not authorized to update this booking" }, { status: 403 });
      }

      const currentStatus = String(existingBooking.status || "pending").toLowerCase();
      const validTransition = targetStatus === "completed"
        ? ["confirmed", "accepted"].includes(currentStatus)
        : currentStatus === "pending";
      if (!validTransition) {
        return NextResponse.json({ success: false, error: "This booking has already been updated" }, { status: 409 });
      }
    } else if (targetStatus === "cancelled" && existingBooking.client_id !== user.id) {
      return NextResponse.json({ success: false, error: "Not authorized to cancel this booking" }, { status: 403 });
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

    // ── Completion ──
    if (targetStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    }

    // ── Client Cancellation ──
    if (targetStatus === "cancelled") {
      // Do not allow cancellation of completed or rejected bookings
      if (!["pending", "confirmed"].includes(String(existingBooking.status || "").toLowerCase())) {
        return NextResponse.json(
          { success: false, error: "This booking can no longer be cancelled" },
          { status: 409 }
        );
      }
      updates.cancelled_at = new Date().toISOString();
    }

    const { data: updatedBooking, error: updateErr } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.error("[PATCH /api/bookings] Update error:", updateErr);
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }
    if (!updatedBooking) {
      return NextResponse.json({ success: false, error: "This booking was updated by another session" }, { status: 409 });
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