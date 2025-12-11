"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
import type { OnboardingData } from "@/app/(dashboard)/onboarding/page";

interface DocumentUploadStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface DocumentUploadProps {
  label: string;
  description: string;
  value: string | null;
  onChange: (url: string | null) => void;
  required?: boolean;
}

function DocumentUpload({ label, description, value, onChange, required }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, []);

  async function handleFile(file: File) {
    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or image file (JPEG, PNG, WebP)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    setFileName(file.name);

    try {
      // TODO: Implement actual file upload to S3/storage
      // For now, we'll simulate an upload and use a placeholder URL
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In production, this would be the actual uploaded file URL
      const mockUrl = `/uploads/${Date.now()}-${file.name}`;
      onChange(mockUrl);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload file. Please try again.");
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove() {
    onChange(null);
    setFileName(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {value && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Uploaded
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>

      {value ? (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <FileText className="w-8 h-8 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName || "Document uploaded"}</p>
            <p className="text-xs text-muted-foreground">Click remove to upload a different file</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-destructive hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <Upload className={`w-8 h-8 mx-auto mb-2 ${isUploading ? "animate-pulse" : ""} text-muted-foreground`} />
          {isUploading ? (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          ) : (
            <>
              <p className="text-sm font-medium">Drop file here or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPEG, PNG up to 10MB</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function DocumentUploadStep({ data, updateData, onNext, onBack }: DocumentUploadStepProps) {
  const canProceed = data.crDocumentUrl !== null;

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
        <p className="font-medium text-amber-800 mb-1">Why we need these documents</p>
        <p className="text-amber-700">
          To protect our community, we verify all business profiles before allowing equipment listings.
          Your documents are stored securely and only used for verification purposes.
        </p>
      </div>

      <div className="space-y-6">
        <DocumentUpload
          label="Commercial Registration (CR) Document"
          description="Upload a copy of your CR certificate from the Ministry of Commerce"
          value={data.crDocumentUrl}
          onChange={(url) => updateData({ crDocumentUrl: url })}
          required
        />

        <DocumentUpload
          label="VAT Registration Certificate"
          description="Upload your VAT registration certificate (optional if not VAT registered)"
          value={data.vatDocumentUrl}
          onChange={(url) => updateData({ vatDocumentUrl: url })}
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Continue
        </Button>
      </div>
    </div>
  );
}
