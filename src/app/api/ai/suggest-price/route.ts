import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { suggestPricing } from "@/lib/ai/equipment-classifier";
import { z } from "zod";

const priceSchema = z.object({
  category: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().min(1990).max(2030),
  condition: z.enum(["excellent", "good", "fair", "poor"]),
  country: z.enum(["SA", "BH"]),
});

/**
 * POST /api/ai/suggest-price
 * Get AI-suggested pricing for equipment rental
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = priceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const suggestion = await suggestPricing(validation.data);

    return NextResponse.json({
      success: true,
      suggestion,
    });
  } catch (error) {
    console.error("Price suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to suggest pricing" },
      { status: 500 }
    );
  }
}
