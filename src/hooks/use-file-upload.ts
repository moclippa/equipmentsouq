"use client";

import { useState, useCallback } from "react";

export type FileCategory = "documents" | "equipment" | "inspections" | "avatars";

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

interface UploadResult {
  publicUrl: string;
  fileKey: string;
}

export function useFileUpload(category: FileCategory) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setState({ isUploading: true, progress: 0, error: null });

      try {
        // Step 1: Get presigned URL from our API
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            category,
            fileSize: file.size,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to get upload URL");
        }

        const { uploadUrl, publicUrl, fileKey, devMode } = await response.json();

        // Development mode: S3 not configured, return mock URL
        if (devMode) {
          setState({ isUploading: false, progress: 100, error: null });
          return { publicUrl, fileKey };
        }

        // Step 2: Upload directly to S3
        setState((prev) => ({ ...prev, progress: 10 }));

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file to storage");
        }

        setState({ isUploading: false, progress: 100, error: null });
        return { publicUrl, fileKey };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setState({ isUploading: false, progress: 0, error: message });
        return null;
      }
    },
    [category]
  );

  const reset = useCallback(() => {
    setState({ isUploading: false, progress: 0, error: null });
  }, []);

  return {
    ...state,
    upload,
    reset,
  };
}
