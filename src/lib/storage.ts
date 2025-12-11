import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3-compatible storage client (works with AWS S3, Cloudflare R2, MinIO)
const s3Client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT, // For R2: https://<account_id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
});

const BUCKET_NAME = process.env.S3_BUCKET || "equipmentsouq";

// File categories for organizing uploads
export type FileCategory = "documents" | "equipment" | "inspections" | "avatars";

/**
 * Generate a presigned URL for direct browser upload
 * This allows uploading directly to S3 without going through our server
 */
export async function getUploadUrl(
  category: FileCategory,
  fileName: string,
  contentType: string,
  expiresIn = 3600 // 1 hour
): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
  const fileKey = `${category}/${Date.now()}-${sanitizeFileName(fileName)}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  // Public URL depends on the storage provider
  const publicUrl = process.env.S3_PUBLIC_URL
    ? `${process.env.S3_PUBLIC_URL}/${fileKey}`
    : `https://${BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${fileKey}`;

  return { uploadUrl, fileKey, publicUrl };
}

/**
 * Upload a file directly from the server (for small files or processing)
 */
export async function uploadFile(
  category: FileCategory,
  fileName: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<{ fileKey: string; publicUrl: string }> {
  const fileKey = `${category}/${Date.now()}-${sanitizeFileName(fileName)}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: body,
      ContentType: contentType,
    })
  );

  const publicUrl = process.env.S3_PUBLIC_URL
    ? `${process.env.S3_PUBLIC_URL}/${fileKey}`
    : `https://${BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${fileKey}`;

  return { fileKey, publicUrl };
}

/**
 * Delete a file from storage
 */
export async function deleteFile(fileKey: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    })
  );
}

/**
 * Sanitize filename for safe storage
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
}

/**
 * Validate file type for uploads
 */
export function validateFileType(
  contentType: string,
  category: FileCategory
): boolean {
  const allowedTypes: Record<FileCategory, string[]> = {
    documents: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    equipment: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
    ],
    inspections: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
    ],
    avatars: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  };

  return allowedTypes[category]?.includes(contentType) ?? false;
}

/**
 * Get max file size in bytes for a category
 */
export function getMaxFileSize(category: FileCategory): number {
  const maxSizes: Record<FileCategory, number> = {
    documents: 10 * 1024 * 1024, // 10MB
    equipment: 15 * 1024 * 1024, // 15MB
    inspections: 15 * 1024 * 1024, // 15MB
    avatars: 5 * 1024 * 1024, // 5MB
  };

  return maxSizes[category];
}
