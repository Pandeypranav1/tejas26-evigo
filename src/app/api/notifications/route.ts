import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const requestedUserId = new URL(request.url).searchParams.get("user_id");
    if (requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json({ success: false, error: "Not authorized to view these notifications" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[GET /api/notifications] Supabase error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      unreadCount,
    });
  } catch (err: any) {
    console.error("[GET /api/notifications] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, markAllAsRead } = body;
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const supabase = createAdminClient();

    if (markAllAsRead) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
      });
    }

    if (id) {
      const { data, error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      if (!data) {
        return NextResponse.json(
          { success: false, error: "Notification not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Notification marked as read",
      });
    }

    return NextResponse.json(
      { success: false, error: "id or markAllAsRead is required" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[PATCH /api/notifications] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
