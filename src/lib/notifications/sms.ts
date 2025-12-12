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
  leadName: string | null;
  interestedIn: string;
}): Promise<void> {
  const { ownerPhone, equipmentTitle, leadName, interestedIn } = params;

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

  const name = leadName || "Someone";
  const message = `EquipmentSouq: ${name} wants to ${interestText} your "${title}". Check your leads at equipmentsouq.com/my-leads`;

  // Fire and forget - don't await to avoid blocking the response
  sendSMS({ to: ownerPhone, message }).catch((err) => {
    console.error("Failed to send lead notification SMS:", err);
  });
}

/**
 * Notify equipment owner of a new booking request
 */
export async function notifyOwnerOfBookingRequest(params: {
  ownerPhone: string | null;
  equipmentTitle: string;
  renterName: string;
  startDate: string;
  endDate: string;
}): Promise<void> {
  const { ownerPhone, equipmentTitle, renterName, startDate, endDate } = params;

  if (!ownerPhone) {
    console.log("[SMS] Owner has no phone number, skipping booking notification");
    return;
  }

  const title = equipmentTitle.length > 25
    ? equipmentTitle.substring(0, 22) + "..."
    : equipmentTitle;

  const message = `EquipmentSouq: ${renterName} wants to book "${title}" (${startDate} - ${endDate}). Respond within 48hrs at equipmentsouq.com/my-listings`;

  sendSMS({ to: ownerPhone, message }).catch((err) => {
    console.error("Failed to send booking request notification SMS:", err);
  });
}

/**
 * Notify renter of booking request status update
 */
export async function notifyRenterOfBookingStatus(params: {
  renterPhone: string | null;
  equipmentTitle: string;
  status: "CONFIRMED" | "DECLINED" | "EXPIRED";
  ownerPhone?: string | null;
}): Promise<void> {
  const { renterPhone, equipmentTitle, status, ownerPhone } = params;

  if (!renterPhone) {
    console.log("[SMS] Renter has no phone number, skipping notification");
    return;
  }

  const title = equipmentTitle.length > 25
    ? equipmentTitle.substring(0, 22) + "..."
    : equipmentTitle;

  let message: string;
  switch (status) {
    case "CONFIRMED":
      message = `EquipmentSouq: Your booking for "${title}" is confirmed!${ownerPhone ? ` Contact owner: ${ownerPhone}` : ""} Check details at equipmentsouq.com`;
      break;
    case "DECLINED":
      message = `EquipmentSouq: Your booking request for "${title}" was declined. Browse more equipment at equipmentsouq.com`;
      break;
    case "EXPIRED":
      message = `EquipmentSouq: Your booking request for "${title}" has expired (no response in 48hrs). Try contacting the owner directly or browse more at equipmentsouq.com`;
      break;
  }

  sendSMS({ to: renterPhone, message }).catch((err) => {
    console.error("Failed to send booking status notification SMS:", err);
  });
}

/**
 * Notify business owner that their verification was approved
 */
export async function notifyVerificationApproved(params: {
  userPhone: string | null;
  companyName: string | null;
}): Promise<void> {
  const { userPhone, companyName } = params;

  if (!userPhone) {
    console.log("[SMS] User has no phone number, skipping verification approval notification");
    return;
  }

  const company = companyName || "Your business";
  const message = `EquipmentSouq: ${company} has been verified! You can now list equipment and receive leads. Start listing at equipmentsouq.com/dashboard/my-listings`;

  sendSMS({ to: userPhone, message }).catch((err) => {
    console.error("Failed to send verification approval SMS:", err);
  });
}

/**
 * Notify business owner that their verification was rejected
 */
export async function notifyVerificationRejected(params: {
  userPhone: string | null;
  companyName: string | null;
  reason: string;
}): Promise<void> {
  const { userPhone, companyName, reason } = params;

  if (!userPhone) {
    console.log("[SMS] User has no phone number, skipping verification rejection notification");
    return;
  }

  const company = companyName || "Your business";
  // Keep reason short for SMS
  const shortReason = reason.length > 50 ? reason.substring(0, 47) + "..." : reason;
  const message = `EquipmentSouq: ${company} verification was not approved. Reason: ${shortReason}. Update your documents at equipmentsouq.com/dashboard/settings/business`;

  sendSMS({ to: userPhone, message }).catch((err) => {
    console.error("Failed to send verification rejection SMS:", err);
  });
}
