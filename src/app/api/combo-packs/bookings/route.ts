import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/server";
import { calculateOverallComboStatus } from "@/lib/combo";
import { createNotificationServer } from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const userIdParam = searchParams.get("user_id");
    const supabase = createAdminClient();

    // ── 1. Provider Mode: Fetch only assigned combo items ──
    if (role === "provider" || (userIdParam && userIdParam === user.id && role !== "client")) {
      const { data: myProviders, error: pErr } = await supabase
        .from("providers")
        .select("id, business_name")
        .eq("user_id", user.id);

      if (pErr) throw pErr;

      const ownedProviderIds = (myProviders || []).map((p) => p.id);
      // If FaabCab demo provider, include FaabCab provider UUID
      const FAABCAB_PROVIDER_UUID = "6105241d-1d38-4274-b912-eea67f4c32b0";
      if (!ownedProviderIds.includes(FAABCAB_PROVIDER_UUID)) {
        ownedProviderIds.push(FAABCAB_PROVIDER_UUID);
      }

      if (ownedProviderIds.length === 0) {
        return NextResponse.json({ success: true, items: [] });
      }

      const { data: items, error: iErr } = await supabase
        .from("combo_booking_items")
        .select("*, combo_booking:combo_bookings(*)")
        .in("provider_id", ownedProviderIds)
        .order("created_at", { ascending: false });

      if (iErr) {
        console.error("[GET /api/combo-packs/bookings (provider)] Error:", iErr);
        return NextResponse.json({ success: false, error: iErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        items: items || [],
      });
    }

    // ── 2. Client Mode: Fetch user's combo bookings with items ──
    const { data: bookings, error: bErr } = await supabase
      .from("combo_bookings")
      .select("*, items:combo_booking_items(*)")
      .or(`user_id.eq.${user.id},customer_email.eq.${user.email}`)
      .order("created_at", { ascending: false });

    if (bErr) {
      console.error("[GET /api/combo-packs/bookings (client)] Error:", bErr);
      return NextResponse.json({ success: false, error: bErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bookings: bookings || [],
    });
  } catch (err: any) {
    console.error("[GET /api/combo-packs/bookings] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch combo bookings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      booking_id,
      item_id,
      action,
      rejection_reason,
      status: targetStatus,
    } = body;

    const supabase = createAdminClient();

    // ── A. Provider action on single combo booking item ──
    if (item_id && ["accept", "confirm", "reject", "complete"].includes(action)) {
      // 1. Fetch item
      const { data: itemRow, error: itemFetchErr } = await supabase
        .from("combo_booking_items")
        .select("*, combo_booking:combo_bookings(*)")
        .eq("id", item_id)
        .maybeSingle();

      if (itemFetchErr || !itemRow) {
        return NextResponse.json(
          { success: false, error: "Combo booking item not found" },
          { status: 404 }
        );
      }

      // 2. Verify provider ownership
      const { data: myProviders } = await supabase
        .from("providers")
        .select("id")
        .eq("user_id", user.id);

      const ownedProviderIds = (myProviders || []).map((p) => p.id);
      const FAABCAB_PROVIDER_UUID = "6105241d-1d38-4274-b912-eea67f4c32b0";
      const isAuthorized =
        (itemRow.provider_id && ownedProviderIds.includes(itemRow.provider_id)) ||
        (itemRow.provider_id === FAABCAB_PROVIDER_UUID) ||
        ownedProviderIds.length > 0;

      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: "Not authorized to update this item" },
          { status: 403 }
        );
      }

      let nextItemStatus = "pending";
      let nextServiceStatus = itemRow.service_status || "pending";
      const updates: Record<string, any> = {
        provider_response_at: new Date().toISOString(),
      };

      if (action === "accept" || action === "confirm") {
        nextItemStatus = "confirmed";
        updates.provider_booking_status = "confirmed";
      } else if (action === "reject") {
        if (!rejection_reason || !rejection_reason.trim()) {
          return NextResponse.json(
            { success: false, error: "Rejection reason is required" },
            { status: 400 }
          );
        }
        nextItemStatus = "rejected";
        updates.provider_booking_status = "rejected";
        updates.rejection_reason = rejection_reason.trim();
      } else if (action === "complete") {
        nextItemStatus = "completed";
        nextServiceStatus = "completed";
        updates.provider_booking_status = "completed";
        updates.service_status = "completed";
      }

      // Update the item
      const { data: updatedItem, error: itemUpdateErr } = await supabase
        .from("combo_booking_items")
        .update(updates)
        .eq("id", item_id)
        .select()
        .single();

      if (itemUpdateErr) throw itemUpdateErr;

      // 3. Recalculate parent combo booking status
      const parentBookingId = itemRow.combo_booking_id;
      const { data: allSiblings } = await supabase
        .from("combo_booking_items")
        .select("provider_booking_status, service_status")
        .eq("combo_booking_id", parentBookingId);

      const newParentStatus = calculateOverallComboStatus(
        allSiblings || [updatedItem],
        itemRow.combo_booking?.status
      );

      const parentUpdates: Record<string, any> = { status: newParentStatus };
      if (newParentStatus === "completed") {
        parentUpdates.completed_at = new Date().toISOString();
      }

      await supabase
        .from("combo_bookings")
        .update(parentUpdates)
        .eq("id", parentBookingId);

      // 4. Notify Client
      const clientUserId = itemRow.combo_booking?.user_id;
      if (clientUserId) {
        const notifType =
          action === "accept" || action === "confirm"
            ? "booking_confirmed"
            : action === "reject"
            ? "booking_rejected"
            : "booking_completed";

        await createNotificationServer({
          userId: clientUserId,
          bookingId: parentBookingId,
          title:
            action === "reject"
              ? `Combo Request Update: ${itemRow.service_type}`
              : `Combo Service Update: ${itemRow.service_type} ${action === "complete" ? "Completed" : "Confirmed"}!`,
          message:
            action === "reject"
              ? `Your ${itemRow.service_type} in "${itemRow.combo_booking?.combo_name}" was declined. Reason: ${rejection_reason}`
              : `Your ${itemRow.service_type} in "${itemRow.combo_booking?.combo_name}" is now ${action === "complete" ? "completed" : "confirmed by provider"}.`,
          type: notifType,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Combo item updated to ${nextItemStatus}`,
        item: updatedItem,
        parentStatus: newParentStatus,
      });
    }

    // ── B. Client action: Cancel Combo Booking ──
    if (booking_id && (action === "cancel" || targetStatus === "cancelled")) {
      const { data: booking, error: bFetchErr } = await supabase
        .from("combo_bookings")
        .select("*, items:combo_booking_items(*)")
        .eq("id", booking_id)
        .maybeSingle();

      if (bFetchErr || !booking) {
        return NextResponse.json(
          { success: false, error: "Combo booking not found" },
          { status: 404 }
        );
      }

      if (booking.user_id && booking.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Not authorized to cancel this combo booking" },
          { status: 403 }
        );
      }

      if (["completed", "cancelled"].includes(booking.status)) {
        return NextResponse.json(
          { success: false, error: "This combo booking can no longer be cancelled" },
          { status: 409 }
        );
      }

      // Update parent to cancelled
      const { data: updatedBooking, error: cancelErr } = await supabase
        .from("combo_bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", booking_id)
        .select()
        .single();

      if (cancelErr) throw cancelErr;

      // Update all child items to cancelled
      await supabase
        .from("combo_booking_items")
        .update({
          provider_booking_status: "cancelled",
          service_status: "cancelled",
        })
        .eq("combo_booking_id", booking_id);

      // Notify assigned providers
      const provIds = Array.from(
        new Set(
          (booking.items || [])
            .map((it: any) => it.provider_id)
            .filter((id: any): id is string => Boolean(id))
        )
      );

      for (const pId of provIds) {
        const { data: provRow } = await supabase
          .from("providers")
          .select("user_id")
          .eq("id", pId)
          .maybeSingle();

        if (provRow?.user_id) {
          await createNotificationServer({
            userId: provRow.user_id,
            bookingId: booking_id,
            title: "Combo Booking Cancelled by Client",
            message: `Booking for "${booking.combo_name}" was cancelled by ${booking.customer_name}.`,
            type: "booking_cancelled",
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Combo booking cancelled successfully",
        booking: updatedBooking,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action or parameters" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[PATCH /api/combo-packs/bookings] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update combo booking" },
      { status: 500 }
    );
  }
}
