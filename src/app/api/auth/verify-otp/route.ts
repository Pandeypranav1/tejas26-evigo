import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone, otp, role } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Phone and OTP are required" },
        { status: 400 }
      );
    }

    // Demo OTP
    if (otp !== "123456") {
      return NextResponse.json(
        { error: "Invalid OTP. Please enter 123456." },
        { status: 400 }
      );
    }

    const effectiveRole = role === "provider" ? "provider" : "client";

    return NextResponse.json({
      success: true,
      user: {
        id: `demo-${phone}`,
        phone: phone,
        role: effectiveRole,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[verify-otp] Error:", error);

    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}