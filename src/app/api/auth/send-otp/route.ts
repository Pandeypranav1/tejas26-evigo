import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Rate limit: 1 OTP per email per 30 seconds in memory
const rateLimit = new Map<string, number>();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // In-Memory Rate Limit Check (1 request per 30 seconds per email)
    const lastSent = rateLimit.get(normalizedEmail);
    if (lastSent && Date.now() - lastSent < 30000) {
      const waitSec = Math.ceil((30000 - (Date.now() - lastSent)) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSec} seconds before requesting another OTP.` },
        { status: 429 }
      );
    }

    // Server-side Supabase client with public anon key for Auth endpoints
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // CRITICAL FIX: Explicitly pass `options: { shouldCreateUser: true }`
    // so brand-new email addresses trigger user creation and receive OTP email.
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    // Safe Diagnostic Logging (Never logs OTP or secrets)
    console.log("[send-otp] Diagnostic log:", {
      stage: "otp_request",
      emailDomain: normalizedEmail.split("@")[1] || "unknown",
      shouldCreateUser: true,
      success: !error,
      errorCode: (error as any)?.code || (error as any)?.status || null,
      errorMessage: error?.message || null,
    });

    if (error) {
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("rate limit") || (error as any)?.status === 429) {
        return NextResponse.json(
          { error: "You are requesting OTPs too quickly. Please wait a minute before trying again." },
          { status: 429 }
        );
      }
      if (msg.includes("signups") || msg.includes("not allowed")) {
        return NextResponse.json(
          { error: "Signups are currently disabled. Please contact system admin." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: error.message || "Failed to send OTP email." },
        { status: 400 }
      );
    }

    // Record rate limit timestamp only on successful dispatch
    rateLimit.set(normalizedEmail, Date.now());

    return NextResponse.json({
      success: true,
      message: `OTP sent to ${normalizedEmail}. Check your inbox or Spam/Promotions folder.`,
    });
  } catch (err: any) {
    console.error("[send-otp] Unexpected error:", err);
    return NextResponse.json(
      { error: "Network error or service unavailable. Please try again later." },
      { status: 500 }
    );
  }
}
