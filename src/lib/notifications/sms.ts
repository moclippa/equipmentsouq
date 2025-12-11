/**
 * SMS Notification Service
 * Uses Twilio to send SMS notifications to equipment owners
 */

interface SendSMSOptions {
  to: string;
  message: string;
}

/**
 * Send SMS notification
 * Fails silently in development if Twilio is not configured
 */
export async function sendSMS({ to, message }: SendSMSOptions): Promise<boolean> {
  // Check if Twilio is configured
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log(`[DEV] SMS to ${to}: ${message}`);
    return true;
  }

  try {
    const twilioClient = await import("twilio").then((m) =>
      m.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    );

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    return true;
  } catch (error) {
    console.error("SMS send error:", error);
    return false;
  }
}

/**
 * Notify equipment owner of a new lead
 */
export async function notifyOwnerOfNewLead(params: {
  ownerPhone: string | null;
  ownerName: string | null;
  equipmentTitle: string;
  leadName: string;
  interestedIn: string;
}): Promise<void> {
  const { ownerPhone, ownerName, equipmentTitle, leadName, interestedIn } = params;

  if (!ownerPhone) {
    console.log("[SMS] Owner has no phone number, skipping notification");
    return;
  }

  // Truncate equipment title if too long
  const title = equipmentTitle.length > 30
    ? equipmentTitle.substring(0, 27) + "..."
    : equipmentTitle;

  const interestText = interestedIn === "both"
    ? "rent or buy"
    : interestedIn;

  const message = `EquipmentSouq: ${leadName} wants to ${interestText} your "${title}". Check your leads at equipmentsouq.com/my-leads`;

  // Fire and forget - don't await to avoid blocking the response
  sendSMS({ to: ownerPhone, message }).catch((err) => {
    console.error("Failed to send lead notification SMS:", err);
  });
}
