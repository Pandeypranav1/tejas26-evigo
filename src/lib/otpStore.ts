const ENV = process.env.NODE_ENV || "development";

type OTPRecord = { otp: string; expiresAt: number; attempts: number };
const otpCache = new Map<string, OTPRecord>();

export async function sendOTP(phone: string, otp: string) {
  // Save OTP in temporary memory store, 5 min expiry
  otpCache.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 });

  if (process.env.TWILIO_ACCOUNT_SID) {
    // Prepare integration for WhatsApp API / SMS
    console.log(`[Real Mode] Sending OTP ${otp} to ${phone}`);
    return true;
  } else {
    // Demo Mode
    console.log(`[Demo OTP] Generating demo OTP for ${phone}: ${otp}`);
    return true;
  }
}

export function verifyOTP(phone: string, otp: string): { success: boolean; message: string } {
  const record = otpCache.get(phone);
  
  if (!record) {
    return { success: false, message: "OTP not found or expired" };
  }
  
  if (Date.now() > record.expiresAt) {
    otpCache.delete(phone);
    return { success: false, message: "OTP has expired" };
  }
  
  record.attempts += 1;
  if (record.attempts > 3) {
    otpCache.delete(phone);
    return { success: false, message: "Maximum verification attempts exceeded" };
  }
  
  if (record.otp === otp) {
    otpCache.delete(phone);
    return { success: true, message: "OTP verified successfully" };
  }
  
  return { success: false, message: "Invalid OTP" };
}
