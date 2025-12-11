import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { classifyEquipment } from "@/lib/ai/equipment-classifier";
import { z } from "zod";

const classifySchema = z.object({
  imageBase64: z.string().min(100),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

/**
 * POST /api/ai/classify-equipment
 * Classify equipment from a photo using AI vision
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = classifySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { imageBase64, mimeType } = validation.data;
    const classification = await classifyEquipment(imageBase64, mimeType);

    return NextResponse.json({
      success: true,
      classification,
    });
  } catch (error) {
    console.error("Equipment classification error:", error);
    return NextResponse.json(
      { error: "Failed to classify equipment" },
      { status: 500 }
    );
  }
}
