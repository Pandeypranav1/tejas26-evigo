import { NextResponse } from "next/server";
import { sendOTP } from "@/lib/otpStore";

const rateLimit = new Map<string, number>();

function getTenDigits(raw: string) {
  const v = raw.replace(/\D/g, "");
  if (v.length === 12 && v.startsWith("91")) return v.slice(2);
  if (v.length === 11 && v.startsWith("0")) return v.slice(1);
  return v;
}

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const tenDigits = getTenDigits(phone);
    if (!/^[6-9]\d{9}$/.test(tenDigits)) {
      return NextResponse.json({ error: "Enter a valid Indian mobile number" }, { status: 400 });
    }

    const normalizedPhone = `+91${tenDigits}`;

    console.log(`[DEMO MODE] Allowing number: ${tenDigits}`);

    // Rate Limit (1 per 30s per number)
    const lastSent = rateLimit.get(normalizedPhone);
    if (lastSent && Date.now() - lastSent < 30000) {
      return NextResponse.json({ error: "Please wait 30 seconds before requesting another OTP." }, { status: 429 });
    }
    rateLimit.set(normalizedPhone, Date.now());

    // Generate static OTP for demo mode
    const otp = "123456";

    await sendOTP(normalizedPhone, otp);

    return NextResponse.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
