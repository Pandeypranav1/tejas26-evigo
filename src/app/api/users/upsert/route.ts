import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * POST /api/users/upsert
 * Body: { phone, role, name?, email?, city?, profile_image? }
 *
 * Creates or updates a user record in Supabase. Called after OTP verification.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, role, name, email, city, profile_image } = body;

    if (!phone || !role) {
      return NextResponse.json(
        { error: "phone and role are required" },
        { status: 400 }
      );
    }

    if (!["client", "provider"].includes(role)) {
      return NextResponse.json(
        { error: "role must be 'client' or 'provider'" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          phone,
          role,
          name: name ?? null,
          email: email ?? null,
          city: city ?? null,
          profile_image: profile_image ?? null,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: "phone",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error("[users/upsert] Supabase error:", error);
      return NextResponse.json({ error: "Failed to save user" }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data });
  } catch (err: unknown) {
    console.error("[users/upsert] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/users/upsert?phone=+91XXXXXXXXXX
 * Fetches a user by phone number.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "phone query param is required" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ user: null }, { status: 404 });

    return NextResponse.json({ user: data });
  } catch (err: unknown) {
    console.error("[users/upsert] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
