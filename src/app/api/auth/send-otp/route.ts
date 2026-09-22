import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Rate limit: 1 OTP per email per 30 seconds (in-memory, resets on server restart)
const rateLimit = new Map<string, number>();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 }
      );
    }

    // Rate limit (1 per 30s per email)
    const lastSent = rateLimit.get(normalizedEmail);
    if (lastSent && Date.now() - lastSent < 30000) {
      return NextResponse.json(
        { error: "Please wait 30 seconds before requesting another OTP." },
        { status: 429 }
      );
    }
    rateLimit.set(normalizedEmail, Date.now());

    // Use a server-side Supabase client with the anon key.
    // signInWithOtp is a public Auth endpoint that works with the anon key.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await supabase.auth.signInWithOtp({ email: normalizedEmail });

    if (error) {
      console.error("[send-otp] Supabase error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to send OTP" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent to your email. Please check your inbox.",
    });
  } catch (err: any) {
    console.error("[send-otp] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}
