import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "user_id parameter is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/profile] Error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (err: any) {
    console.error("[GET /api/profile] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { user_id, full_name, phone, city, experience_years, description, service_areas } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "user_id is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify profile exists
    const { data: existing, error: findError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", user_id)
      .maybeSingle();

    if (findError || !existing) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    // Keep email strictly read-only per requirements
    const profileUpdates: Record<string, any> = {};
    if (typeof full_name === "string") profileUpdates.full_name = full_name.trim();
    if (typeof phone === "string") profileUpdates.phone = phone.trim();
    if (typeof city === "string") profileUpdates.city = city.trim();

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update(profileUpdates)
      .eq("id", user_id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("[PATCH /api/profile] Profile update error:", updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Also update provider-specific fields if provider row exists
    const providerUpdates: Record<string, any> = {};
    if (typeof full_name === "string") providerUpdates.owner_name = full_name.trim();
    if (typeof phone === "string") providerUpdates.phone = phone.trim();
    if (typeof city === "string") providerUpdates.city = city.trim();
    if (typeof experience_years === "number") providerUpdates.experience_years = experience_years;
    if (typeof description === "string") providerUpdates.description = description.trim();
    if (Array.isArray(service_areas)) providerUpdates.service_areas = service_areas;

    if (Object.keys(providerUpdates).length > 0) {
      try {
        await supabase
          .from("providers")
          .update(providerUpdates)
          .eq("user_id", user_id);
      } catch (provErr) {
        console.warn("[PATCH /api/profile] Provider table update warning:", provErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error("[PATCH /api/profile] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
