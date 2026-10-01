import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { ComboPack } from "@/lib/combo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const slug = searchParams.get("slug");
    const id = searchParams.get("id");

    const supabase = createAdminClient();

    let query = supabase
      .from("combo_packs")
      .select("*, items:combo_pack_items(*)")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (id) {
      query = query.eq("id", id);
    } else if (slug) {
      query = query.eq("slug", slug);
    }

    if (category && category !== "All") {
      query = query.eq("category", category);
    }

    if (city && city !== "All") {
      query = query.ilike("city", `%${city}%`);
    }

    const { data: dbPacks, error } = await query;

    if (error) {
      console.warn("[GET /api/combo-packs] DB query error:", error);
      return NextResponse.json({
        success: true,
        comboPacks: [],
      });
    }

    return NextResponse.json({
      success: true,
      comboPacks: dbPacks || [],
    });
  } catch (err: any) {
    console.error("[GET /api/combo-packs] Error:", err);
    return NextResponse.json({
      success: true,
      comboPacks: [],
      error: err?.message,
    });
  }
}
