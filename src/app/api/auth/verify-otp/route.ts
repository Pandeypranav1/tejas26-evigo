import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email, otp, role } = await request.json();

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "A valid 6-digit OTP is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const effectiveRole = role === "provider" ? "provider" : "client";

    // Use a server-side Supabase client with the anon key.
    // verifyOtp is a public Auth endpoint that works with the anon key.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: otp,
      type: "email",
    });

    // Diagnostic logging (Never log OTP code or secrets)
    console.log("[verify-otp] Diagnostic log:", {
      stage: "otp_verification",
      emailDomain: normalizedEmail.split("@")[1] || "unknown",
      success: !error && !!data?.user,
      errorCode: (error as any)?.code || (error as any)?.status || null,
      errorMessage: error?.message || null,
    });

    if (error) {
      const msg = error.message?.toLowerCase() || "";
      let userMsg = error.message || "Invalid or expired OTP";
      if (msg.includes("expired")) {
        userMsg = "The OTP has expired. Please request a new code.";
      } else if (msg.includes("invalid")) {
        userMsg = "Incorrect OTP code. Please verify and try again.";
      }
      return NextResponse.json(
        { error: userMsg },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    // Ensure profile row exists in public.profiles for first-time user
    try {
      const adminSupabase = createAdminClient();
      const { data: existingProfile } = await adminSupabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!existingProfile) {
        await adminSupabase.from("profiles").upsert({
          id: data.user.id,
          email: normalizedEmail,
          role: effectiveRole,
          full_name: data.user.user_metadata?.full_name || normalizedEmail.split("@")[0],
        });
      }
    } catch (profErr) {
      console.warn("[verify-otp] Profile setup warning:", profErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || normalizedEmail,
        role: effectiveRole,
        createdAt: data.user.created_at || new Date().toISOString(),
      },
      // Return session so client can establish it
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }
        : null,
    });
  } catch (err: any) {
    console.error("[verify-otp] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to verify OTP due to a server error." },
      { status: 500 }
    );
  }
}