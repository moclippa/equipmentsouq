import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const trackEventSchema = z.object({
  eventType: z.string().min(1).max(50),
  data: z.record(z.string(), z.unknown()).optional().default({}),
  sessionId: z.string().optional(),
});

/**
 * POST /api/analytics
 * Track an analytics event (fire-and-forget style)
 *
 * Event types:
 * - WHATSAPP_CLICK: User clicked WhatsApp button
 * - CALL_CLICK: User clicked Call button
 * - EQUIPMENT_VIEW: Equipment page viewed
 * - LEAD_SUBMIT: Lead form submitted
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, data, sessionId } = trackEventSchema.parse(body);

    // Get user ID if authenticated (optional)
    const session = await auth();
    const userId = session?.user?.id;

    // Determine country from data or session
    const country = (data.country as "SA" | "BH") ||
      (session?.user?.country as "SA" | "BH") ||
      undefined;

    // Fire-and-forget - don't block response on DB write
    prisma.analyticsEvent.create({
      data: {
        eventType,
        userId,
        sessionId,
        data: data as object,
        country,
      },
    }).catch((err) => {
      console.error("Failed to track analytics event:", err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid event data" },
        { status: 400 }
      );
    }
    console.error("Analytics error:", error);
    return NextResponse.json({ success: true }); // Don't expose errors
  }
}
