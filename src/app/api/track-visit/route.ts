import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { headers } from "next/headers";

export const runtime = "nodejs";

/**
 * POST /api/track-visit
 * Body: { session_id, page_path, page_title?, referrer?, device_type?, user_phone? }
 *
 * Records a page visit in the Supabase `page_visits` table.
 * Uses the service-role key so it works regardless of RLS policies.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      session_id,
      page_path,
      page_title = null,
      referrer = null,
      device_type = null,
      user_phone = null,
    } = body;

    if (!session_id || !page_path) {
      return NextResponse.json(
        { error: "session_id and page_path are required" },
        { status: 400 }
      );
    }

    // Extract IP and User-Agent from request headers
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      null;
    const user_agent = headersList.get("user-agent") || null;

    const supabase = createAdminClient();

    const { error } = await supabase.from("page_visits").insert({
      session_id,
      page_path,
      page_title,
      referrer,
      ip_address: ip,
      user_agent,
      device_type,
      user_phone,
    });

    if (error) {
      console.error("[track-visit] Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to record visit" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[track-visit] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/track-visit
 * Returns the total visit count (public metric).
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { count, error } = await supabase
      .from("page_visits")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json({ total_visits: count ?? 0 });
  } catch (err: unknown) {
    console.error("[track-visit] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
