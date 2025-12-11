import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUploadUrl,
  validateFileType,
  getMaxFileSize,
  type FileCategory,
} from "@/lib/storage";
import { z } from "zod";

const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  category: z.enum(["documents", "equipment", "inspections", "avatars"]),
  fileSize: z.number().positive(),
});

/**
 * POST /api/upload
 * Get a presigned URL for direct upload to S3
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = uploadRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { fileName, contentType, category, fileSize } = validation.data;

    // Validate file type
    if (!validateFileType(contentType, category as FileCategory)) {
      return NextResponse.json(
        { error: `Invalid file type for ${category}` },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = getMaxFileSize(category as FileCategory);
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Check if S3 is configured
    if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
      // Development mode: return mock URL
      const mockUrl = `/uploads/${category}/${Date.now()}-${fileName}`;
      return NextResponse.json({
        uploadUrl: null, // No presigned URL in dev mode
        fileKey: mockUrl,
        publicUrl: mockUrl,
        devMode: true,
        message: "S3 not configured. Using mock URL for development.",
      });
    }

    // Get presigned upload URL
    const { uploadUrl, fileKey, publicUrl } = await getUploadUrl(
      category as FileCategory,
      fileName,
      contentType
    );

    return NextResponse.json({
      uploadUrl,
      fileKey,
      publicUrl,
    });
  } catch (error) {
    console.error("Upload URL generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
