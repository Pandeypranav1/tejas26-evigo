import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);

    const supabase = createAdminClient();
    let query = supabase
      .from("providers")
      .select("*")
      .eq("registration_status", "approved")
      .order("submitted_at", { ascending: false });

    if (category && category !== "All") {
      query = query.eq("category", category);
    }

    if (city) {
      query = query.ilike("city", `%${city}%`);
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      console.error("[GET /api/providers] Supabase error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      providers: data ?? [],
    });
  } catch (err: any) {
    console.error("[GET /api/providers] unexpected error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return NextResponse.json(
    { success: false, error: "Provider registration is handled via /api/providers/register." },
    { status: 405 }
  );
}
