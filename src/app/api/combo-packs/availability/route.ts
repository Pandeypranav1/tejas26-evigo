import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { DEFAULT_COMBO_PACKS } from "@/lib/combo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { combo_pack_id, slug, start_date, end_date } = body;

    if (!combo_pack_id && !slug) {
      return NextResponse.json(
        { success: false, error: "combo_pack_id or slug is required" },
        { status: 400 }
      );
    }

    if (start_date) {
      const selected = new Date(start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        return NextResponse.json({
          success: true,
          isAvailable: false,
          reason: "Booking date cannot be in the past.",
        });
      }
    }

    const supabase = createAdminClient();
    let query = supabase.from("combo_packs").select("*, items:combo_pack_items(*)");

    if (combo_pack_id) {
      query = query.eq("id", combo_pack_id);
    } else {
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
        { success: false, error: "Combo package not found" },
        { status: 404 }
      );
    }

    if (pack.is_active === false) {
      return NextResponse.json({
        success: true,
        isAvailable: false,
        reason: "This combo package is currently not accepting new bookings.",
      });
    }

    return NextResponse.json({
      success: true,
      isAvailable: true,
      combo_pack_id: pack.id,
      name: pack.name,
      city: pack.city,
      duration: pack.duration,
      included_services_count: pack.items?.length || 0,
      verified_providers: true,
    });
  } catch (err: any) {
    console.error("[POST /api/combo-packs/availability] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to verify availability" },
      { status: 500 }
    );
  }
}
