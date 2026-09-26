/**
 * Server-side Brevo Transactional Email Service
 *
 * Requirements:
 * - Use BREVO_API_KEY from server-side environment variables only.
 * - Never expose Brevo API keys in browser/client code.
 * - If provider/client email is unavailable or sending fails, booking must still succeed and email failure must be handled gracefully.
 * - Do not invent any email address.
 */

interface SendEmailParams {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}

export async function sendBrevoEmail({
  toEmail,
  toName,
  subject,
  htmlContent,
}: SendEmailParams): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.warn("[Brevo Email] BREVO_API_KEY is not configured in environment variables. Email notification skipped.");
      return { success: false, skipped: true };
    }

    if (!toEmail || !toEmail.includes("@") || toEmail.endsWith(".demo")) {
      console.warn(`[Brevo Email] Recipient email is missing or demo address (${toEmail}). Skipping send.`);
      return { success: false, skipped: true };
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@evigo.in";
    const senderName = process.env.BREVO_SENDER_NAME || "Evigo Platform";

    const payload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: toEmail.trim(),
          name: toName?.trim() || "Evigo User",
        },
      ],
      subject,
      htmlContent,
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Brevo Email] API error (${response.status}):`, errText);
      return { success: false, error: errText };
    }

    const result = await response.json();
    return { success: true };
  } catch (err: any) {
    console.warn("[Brevo Email] Unexpected error while sending email:", err?.message || err);
    return { success: false, error: err?.message || "Failed to send email" };
  }
}

// ── Email Templates ──────────────────────────────────────────────

function emailLayout(title: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b071a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b071a; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #130e26; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #1f1147 0%, #0d1b2a 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 24px; font-weight: 900; background: linear-gradient(135deg, #a78bfa, #22d3ee); -webkit-background-clip: text; color: #22d3ee; letter-spacing: -0.5px;">
                      ✦ Evigo
                    </span>
                    <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">
                      Smart Bihar Services & Mobility
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0d081e; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                This is an automated notification from Evigo Platform.<br>
                For assistance, please visit your dashboard or reply to our support team.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendNewBookingEmailToProvider(params: {
  providerEmail: string;
  providerName: string;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  service: string;
  date: string;
  time?: string | null;
  pickup?: string | null;
  destination?: string | null;
  passengers?: number | null;
  specialRequest?: string | null;
  dashboardUrl?: string;
}) {
  const {
    providerEmail,
    providerName,
    bookingId,
    customerName,
    customerPhone,
    customerEmail,
    service,
    date,
    time,
    pickup,
    destination,
    passengers,
    specialRequest,
    dashboardUrl = "https://evigo.in/provider/dashboard",
  } = params;

  const content = `
    <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 800; color: #ffffff;">
      🚀 New Booking Request Received
    </h2>
    <p style="margin: 0 0 20px; font-size: 14px; color: #d1d5db; line-height: 1.6;">
      Hello <strong>${providerName}</strong>, a new customer booking request has been submitted for your service. Please review the details below:
    </p>

    <div style="background-color: #1a1435; border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="6">
        <tr>
          <td width="40%" style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Booking ID</td>
          <td width="60%" style="font-size: 13px; font-weight: 800; color: #22d3ee; font-family: monospace;">#${bookingId}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Customer Name</td>
          <td style="font-size: 13px; font-weight: 700; color: #ffffff;">${customerName}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Customer Phone</td>
          <td style="font-size: 13px; font-weight: 600; color: #ffffff;">${customerPhone}</td>
        </tr>
        ${customerEmail ? `
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Customer Email</td>
          <td style="font-size: 13px; font-weight: 600; color: #ffffff;">${customerEmail}</td>
        </tr>` : ""}
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Service</td>
          <td style="font-size: 13px; font-weight: 700; color: #a78bfa;">${service}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Travel / Event Date</td>
          <td style="font-size: 13px; font-weight: 600; color: #ffffff;">${date}</td>
        </tr>
        ${time ? `
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Pickup / Event Time</td>
          <td style="font-size: 13px; font-weight: 600; color: #ffffff;">${time}</td>
        </tr>` : ""}
        ${pickup ? `
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Pickup Location</td>
          <td style="font-size: 13px; font-weight: 600; color: #67e8f9;">${pickup}</td>
        </tr>` : ""}
        ${destination ? `
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Destination</td>
          <td style="font-size: 13px; font-weight: 600; color: #67e8f9;">${destination}</td>
        </tr>` : ""}
        ${passengers ? `
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Passengers / Guests</td>
          <td style="font-size: 13px; font-weight: 600; color: #ffffff;">${passengers}</td>
        </tr>` : ""}
        ${specialRequest ? `
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Special Request</td>
          <td style="font-size: 13px; font-style: italic; color: #fef08a;">"${specialRequest}"</td>
        </tr>` : ""}
      </table>
    </div>

    <div style="text-align: center; margin: 28px 0 10px;">
      <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 12px; font-size: 14px; font-weight: 800; letter-spacing: 0.5px; box-shadow: 0 4px 20px rgba(6,182,212,0.35);">
        Open Provider Dashboard →
      </a>
    </div>
  `;

  return sendBrevoEmail({
    toEmail: providerEmail,
    toName: providerName,
    subject: `New Booking Request #${bookingId.slice(-6)} - ${service}`,
    htmlContent: emailLayout("New Booking Request", content),
  });
}

export async function sendBookingAcceptedEmailToClient(params: {
  clientEmail: string;
  clientName: string;
  bookingId: string;
  providerName: string;
  service: string;
  date: string;
  time?: string | null;
  dashboardUrl?: string;
}) {
  const {
    clientEmail,
    clientName,
    bookingId,
    providerName,
    service,
    date,
    time,
    dashboardUrl = "https://evigo.in/dashboard",
  } = params;

  const content = `
    <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 800; color: #10b981;">
      🎉 Booking Confirmed!
    </h2>
    <p style="margin: 0 0 20px; font-size: 14px; color: #d1d5db; line-height: 1.6;">
      Hello <strong>${clientName}</strong>, great news! <strong>${providerName}</strong> has confirmed your booking request.
    </p>

    <div style="background-color: #142a23; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="6">
        <tr>
          <td width="40%" style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Booking ID</td>
          <td width="60%" style="font-size: 13px; font-weight: 800; color: #34d399; font-family: monospace;">#${bookingId}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Provider</td>
          <td style="font-size: 13px; font-weight: 700; color: #ffffff;">${providerName}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Service</td>
          <td style="font-size: 13px; font-weight: 700; color: #a78bfa;">${service}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Date</td>
          <td style="font-size: 13px; font-weight: 600; color: #ffffff;">${date}</td>
        </tr>
        ${time ? `
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Time</td>
          <td style="font-size: 13px; font-weight: 600; color: #ffffff;">${time}</td>
        </tr>` : ""}
      </table>
    </div>

    <div style="text-align: center; margin: 28px 0 10px;">
      <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #06b6d4); color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 12px; font-size: 14px; font-weight: 800; letter-spacing: 0.5px;">
        View Booking in Dashboard →
      </a>
    </div>
  `;

  return sendBrevoEmail({
    toEmail: clientEmail,
    toName: clientName,
    subject: `Booking Confirmed #${bookingId.slice(-6)} - ${service}`,
    htmlContent: emailLayout("Booking Confirmed", content),
  });
}

export async function sendBookingRejectedEmailToClient(params: {
  clientEmail: string;
  clientName: string;
  bookingId: string;
  providerName: string;
  service: string;
  reason: string;
  dashboardUrl?: string;
}) {
  const {
    clientEmail,
    clientName,
    bookingId,
    providerName,
    service,
    reason,
    dashboardUrl = "https://evigo.in/dashboard",
  } = params;

  const content = `
    <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 800; color: #ef4444;">
      Booking Request Update
    </h2>
    <p style="margin: 0 0 20px; font-size: 14px; color: #d1d5db; line-height: 1.6;">
      Hello <strong>${clientName}</strong>, unfortunately <strong>${providerName}</strong> was unable to accept your booking request for <strong>${service}</strong> at this time.
    </p>

    <div style="background-color: #2b1418; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="6">
        <tr>
          <td width="40%" style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Booking ID</td>
          <td width="60%" style="font-size: 13px; font-weight: 800; color: #fca5a5; font-family: monospace;">#${bookingId}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Reason Given</td>
          <td style="font-size: 13px; font-weight: 700; color: #ffffff;">${reason || "Schedule conflict or vehicle unavailable."}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #9ca3af;">
      You can explore other verified service providers or adjust your schedule on Evigo.
    </p>

    <div style="text-align: center; margin: 24px 0 10px;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #374151; color: #ffffff; text-decoration: none; padding: 11px 24px; border-radius: 12px; font-size: 13px; font-weight: 700;">
        Explore Alternative Services →
      </a>
    </div>
  `;

  return sendBrevoEmail({
    toEmail: clientEmail,
    toName: clientName,
    subject: `Booking Request Declined #${bookingId.slice(-6)} - ${service}`,
    htmlContent: emailLayout("Booking Request Update", content),
  });
}

export async function sendBookingCancelledEmailToProvider(params: {
  providerEmail: string;
  providerName: string;
  bookingId: string;
  customerName: string;
  service: string;
  date: string;
  dashboardUrl?: string;
}) {
  const {
    providerEmail,
    providerName,
    bookingId,
    customerName,
    service,
    date,
    dashboardUrl = "https://evigo.in/provider/dashboard",
  } = params;

  const content = `
    <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 800; color: #f59e0b;">
      Booking Cancelled by Customer
    </h2>
    <p style="margin: 0 0 20px; font-size: 14px; color: #d1d5db; line-height: 1.6;">
      Hello <strong>${providerName}</strong>, customer <strong>${customerName}</strong> has cancelled their booking request for <strong>${service}</strong> scheduled on <strong>${date}</strong>.
    </p>

    <div style="background-color: #261f10; border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="6">
        <tr>
          <td width="40%" style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Booking ID</td>
          <td width="60%" style="font-size: 13px; font-weight: 800; color: #fcd34d; font-family: monospace;">#${bookingId}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Status</td>
          <td style="font-size: 13px; font-weight: 700; color: #f87171;">Cancelled</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0 10px;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #374151; color: #ffffff; text-decoration: none; padding: 11px 24px; border-radius: 12px; font-size: 13px; font-weight: 700;">
        Open Provider Dashboard →
      </a>
    </div>
  `;

  return sendBrevoEmail({
    toEmail: providerEmail,
    toName: providerName,
    subject: `Booking Cancelled #${bookingId.slice(-6)} by ${customerName}`,
    htmlContent: emailLayout("Booking Cancelled", content),
  });
}
