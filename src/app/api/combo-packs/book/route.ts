import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/server";
import { DEFAULT_COMBO_PACKS, calculateComboPrice } from "@/lib/combo";
import { createNotificationServer } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user } = await getAuthenticatedUser();

    const {
      combo_pack_id,
      slug,
      start_date,
      end_date,
      guest_count = 1,
      pickup_location,
      drop_location,
      customer_name,
      customer_phone,
      customer_email,
      special_requests,
    } = body;

    const effectiveName = customer_name?.trim() || user?.user_metadata?.full_name || "Customer";
    const effectivePhone = customer_phone?.trim() || user?.phone || "";
    const effectiveEmail = customer_email?.trim() || user?.email || "";
    const guests = Math.max(1, Number(guest_count) || 1);

    if (!effectiveName || !effectivePhone || !start_date) {
      return NextResponse.json(
        {
          success: false,
          error: "Required booking details (Name, Phone, and Start Date) are missing.",
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch the combo pack details from DB or fallback
    let query = supabase.from("combo_packs").select("*, items:combo_pack_items(*)");
    if (combo_pack_id) {
      query = query.eq("id", combo_pack_id);
    } else if (slug) {
      query = query.eq("slug", slug);
    }

    const { data: dbPack } = await query.maybeSingle();
    const pack =
      dbPack ||
      DEFAULT_COMBO_PACKS.find(
        (p) => p.id === combo_pack_id || p.slug === slug
      );

    if (!pack) {
      return NextResponse.json(
        { success: false, error: "Selected combo package was not found." },
        { status: 404 }
      );
    }

    // 2. Server-side price calculation
    const priceInfo = calculateComboPrice(pack.base_price, pack.discount, guests);

    // 3. Insert parent combo booking
    const parentPayload: Record<string, any> = {
      user_id: user?.id || null,
      combo_pack_id: pack.id,
      combo_name: pack.name,
      total_amount: priceInfo.finalPrice,
      booking_date: new Date().toISOString().split("T")[0],
      start_date: start_date || null,
      end_date: end_date || start_date || null,
      guest_count: guests,
      pickup_location: pickup_location || null,
      drop_location: drop_location || null,
      customer_name: effectiveName,
      customer_phone: effectivePhone,
      customer_email: effectiveEmail || null,
      special_requests: special_requests || null,
      status: "pending",
    };

    const { data: parentBooking, error: parentError } = await supabase
      .from("combo_bookings")
      .insert(parentPayload)
      .select()
      .single();

    if (parentError) {
      console.error("[POST /api/combo-packs/book] Insert parent error:", parentError);
      return NextResponse.json(
        { success: false, error: parentError.message },
        { status: 500 }
      );
    }

    // 4. Insert child booking items
    const rawItems = pack.items && pack.items.length > 0 ? pack.items : [
      {
        service_type: "Transport",
        provider_name: "FaabCab",
        provider_id: "6105241d-1d38-4274-b912-eea67f4c32b0",
        service_id: "b72bf79e-3b1d-4af6-b326-a0f7940f1901",
      },
    ];

    const itemPriceSnapshot = Math.round(priceInfo.finalPrice / Math.max(1, rawItems.length));
    const childItemsPayload = rawItems.map((it: any) => ({
      combo_booking_id: parentBooking.id,
      service_type: it.service_type || "Service",
      service_id: it.service_id || null,
      provider_id: it.provider_id || "6105241d-1d38-4274-b912-eea67f4c32b0",
      provider_name: it.provider_name || (it.service_type === "Transport" ? "FaabCab" : "Service Provider"),
      provider_booking_status: "pending",
      service_status: "pending",
      price_snapshot: itemPriceSnapshot,
    }));

    const { data: createdItems, error: itemsError } = await supabase
      .from("combo_booking_items")
      .insert(childItemsPayload)
      .select();

    if (itemsError) {
      console.warn("[POST /api/combo-packs/book] Child items error:", itemsError);
    }

    // 5. Notify assigned providers via public.notifications (Realtime triggers automatically)
    try {
      const assignedProviderIds = Array.from(
        new Set(
          childItemsPayload
            .map((it: { provider_id?: string | null }) => it.provider_id)
            .filter((id: string | null | undefined): id is string => Boolean(id))
        )
      );

      for (const provId of assignedProviderIds) {
        // Find provider's user_id
        const { data: provRow } = await supabase
          .from("providers")
          .select("id, user_id, business_name")
          .eq("id", provId)
          .maybeSingle();

        const providerUserId = provRow?.user_id;
        if (providerUserId) {
          await createNotificationServer({
            userId: providerUserId,
            bookingId: parentBooking.id,
            title: `🎁 New Combo Request: ${pack.name}`,
            message: `New booking for "${pack.name}" on ${start_date}.\nCustomer: ${effectiveName} (${effectivePhone})\nGuests: ${guests}\nAmount: ₹${priceInfo.finalPrice}`,
            type: "booking_new",
          });
        }
      }
    } catch (notifyErr) {
      console.warn("[POST /api/combo-packs/book] Notification warning:", notifyErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Combo package booked successfully!",
        booking: {
          ...parentBooking,
          items: createdItems || childItemsPayload,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/combo-packs/book] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to complete combo booking" },
      { status: 500 }
    );
  }
}
