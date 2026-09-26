import { createAdminClient } from "@/lib/supabase";

export interface CreateNotificationParams {
  userId: string;
  bookingId?: string | null;
  title: string;
  message: string;
  type: "booking_new" | "booking_confirmed" | "booking_rejected" | "booking_cancelled" | "booking_completed";
}

/**
 * Server-side creation of notification records in public.notifications.
 * Must not be callable from unauthenticated or spoofed client requests.
 */
export async function createNotificationServer({
  userId,
  bookingId,
  title,
  message,
  type,
}: CreateNotificationParams) {
  try {
    if (!userId) {
      console.warn("[Notifications] Cannot create notification: Missing userId");
      return null;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        booking_id: bookingId || null,
        title,
        message,
        type,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[Notifications] Failed to insert notification:", error);
      return null;
    }

    return data;
  } catch (err: any) {
    console.error("[Notifications] Unexpected error creating notification:", err);
    return null;
  }
}
