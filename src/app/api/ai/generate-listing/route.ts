import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateListingContent } from "@/lib/ai/equipment-classifier";
import { z } from "zod";

const generateSchema = z.object({
  category: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().min(1990).max(2030),
  condition: z.enum(["excellent", "good", "fair", "poor"]),
  features: z.array(z.string()),
  specs: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

/**
 * POST /api/ai/generate-listing
 * Generate bilingual listing content from equipment details
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = generateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const content = await generateListingContent(validation.data);

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error("Listing generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate listing content" },
      { status: 500 }
    );
  }
}
