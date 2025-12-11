import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseCRDocument, parseVATDocument } from "@/lib/ai/document-parser";
import { z } from "zod";

const parseDocumentSchema = z.object({
  documentType: z.enum(["cr", "vat"]),
  imageBase64: z.string().min(100), // Base64 encoded image
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
});

/**
 * POST /api/ai/parse-document
 * Parse a business document (CR or VAT) using AI vision
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = parseDocumentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { documentType, imageBase64, mimeType } = validation.data;

    // Handle PDF - for now, just return a message (PDF support requires conversion)
    if (mimeType === "application/pdf") {
      return NextResponse.json(
        {
          error: "PDF parsing not yet supported. Please upload an image (JPEG, PNG, or WebP).",
          suggestion: "Convert your PDF to an image or take a screenshot of the document."
        },
        { status: 400 }
      );
    }

    let result;
    if (documentType === "cr") {
      result = await parseCRDocument(imageBase64, mimeType);
    } else {
      result = await parseVATDocument(imageBase64, mimeType);
    }

    return NextResponse.json({
      success: true,
      documentType,
      data: result,
    });
  } catch (error) {
    console.error("Document parsing error:", error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes("ANTHROPIC_API_KEY")) {
        return NextResponse.json(
          { error: "AI service not configured", devMode: true },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to parse document" },
      { status: 500 }
    );
  }
}
