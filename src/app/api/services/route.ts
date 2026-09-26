import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("provider_id");
    const userId = searchParams.get("user_id");

    const supabase = createAdminClient();

    let providerIds: string[] = [];

    if (userId) {
      // Find all providers owned by this user
      const { data: myProviders } = await supabase
        .from("providers")
        .select("id")
        .eq("user_id", userId);

      if (myProviders && myProviders.length > 0) {
        providerIds = myProviders.map((p) => p.id);
      }
    }

    if (providerId && !providerIds.includes(providerId)) {
      providerIds.push(providerId);
    }

    if (providerIds.length === 0) {
      // Fallback: FaabCab
      providerIds = ["6105241d-1d38-4274-b912-eea67f4c32b0"];
    }

    const { data: services, error } = await supabase
      .from("services")
      .select("*")
      .in("provider_id", providerIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/services] Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      services: services || [],
    });
  } catch (err: any) {
    console.error("[GET /api/services] Unexpected error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
