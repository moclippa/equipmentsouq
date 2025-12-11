"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  Star,
  Sparkles,
  Loader2,
  ImageIcon,
} from "lucide-react";
import Image from "next/image";
import type { EquipmentFormData } from "@/app/(dashboard)/equipment/new/page";

interface PhotosStepProps {
  formData: EquipmentFormData;
  updateFormData: (data: Partial<EquipmentFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PhotosStep({ formData, updateFormData, onNext, onBack }: PhotosStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      await addImages(files);
    },
    [formData.images]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await addImages(files);
    e.target.value = ""; // Reset input
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    formDataUpload.append("category", "equipment");

    const response = await fetch("/api/upload/local", {
      method: "POST",
      body: formDataUpload,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    const data = await response.json();
    return data.url;
  };

  const addImages = async (files: File[]) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // Upload all files and get permanent URLs
      const uploadedImages = await Promise.all(
        files.map(async (file, index) => {
          const url = await uploadFile(file);
          return {
            url,
            file, // Keep file reference for AI classification
            isPrimary: formData.images.length === 0 && index === 0,
            order: formData.images.length + index,
          };
        })
      );

      const updatedImages = [...formData.images, ...uploadedImages];
      updateFormData({ images: updatedImages });

      // If this is the first image, trigger AI classification
      if (formData.images.length === 0 && uploadedImages.length > 0 && uploadedImages[0].file) {
        await classifyFirstImage(uploadedImages[0].file);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload images");
    } finally {
      setIsUploading(false);
    }
  };

  const classifyFirstImage = async (file: File) => {
    setIsClassifying(true);
    setClassificationError(null);

    try {
      // Convert to base64
      const base64 = await fileToBase64(file);

      const response = await fetch("/api/ai/classify-equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        updateFormData({
          aiClassification: data.classification,
        });
      } else {
        const error = await response.json();
        setClassificationError(error.error || "Classification failed");
      }
    } catch (error) {
      console.error("Classification error:", error);
      setClassificationError("Failed to analyze image");
    } finally {
      setIsClassifying(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const updatedImages = formData.images.filter((_, i) => i !== index);
    // If we removed the primary, make the first one primary
    if (updatedImages.length > 0 && !updatedImages.some((img) => img.isPrimary)) {
      updatedImages[0].isPrimary = true;
    }
    // Reorder
    updatedImages.forEach((img, i) => (img.order = i));
    updateFormData({ images: updatedImages });
  };

  const setPrimaryImage = (index: number) => {
    const updatedImages = formData.images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    updateFormData({ images: updatedImages });
  };

  const canProceed = formData.images.length >= 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Upload Photos</h2>
        <p className="text-muted-foreground">
          Add photos of your equipment. The first photo will be used as the main listing image.
        </p>
      </div>

      {/* AI Classification Result */}
      {isClassifying && (
        <Alert>
          <Sparkles className="w-4 h-4" />
          <AlertDescription className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            AI is analyzing your equipment photo...
          </AlertDescription>
        </Alert>
      )}

      {formData.aiClassification && (
        <Alert className="bg-primary/5 border-primary/20">
          <Sparkles className="w-4 h-4 text-primary" />
          <AlertDescription>
            <p className="font-medium mb-1">AI Detection</p>
            <div className="text-sm space-y-1">
              {formData.aiClassification.make && (
                <p>Make: {formData.aiClassification.make}</p>
              )}
              {formData.aiClassification.model && (
                <p>Model: {formData.aiClassification.model}</p>
              )}
              {formData.aiClassification.yearEstimate && (
                <p>Year (est.): {formData.aiClassification.yearEstimate}</p>
              )}
              {formData.aiClassification.condition && (
                <p>Condition: {formData.aiClassification.condition}</p>
              )}
              {formData.aiClassification.confidence && (
                <Badge variant="secondary" className="mt-1">
                  {Math.round(formData.aiClassification.confidence * 100)}% confidence
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {classificationError && (
        <Alert variant="destructive">
          <AlertDescription>{classificationError}</AlertDescription>
        </Alert>
      )}

      {uploadError && (
        <Alert variant="destructive">
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {isUploading && (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading images...
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Drop images here or click to upload</p>
            <p className="text-sm text-muted-foreground">
              JPEG, PNG, or WebP up to 15MB each
            </p>
          </div>
          <label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button variant="outline" className="cursor-pointer" asChild>
              <span>Select Files</span>
            </Button>
          </label>
        </div>
      </div>

      {/* Image Grid */}
      {formData.images.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">
            Uploaded Photos ({formData.images.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {formData.images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={image.url}
                    alt={`Equipment photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Primary Badge */}
                {image.isPrimary && (
                  <Badge className="absolute top-2 start-2 bg-primary">
                    <Star className="w-3 h-3 me-1" />
                    Primary
                  </Badge>
                )}

                {/* Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  {!image.isPrimary && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPrimaryImage(index)}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeImage(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Photo Tips
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Take photos in good lighting</li>
          <li>Include multiple angles (front, side, back)</li>
          <li>Show the equipment controls and cabin interior</li>
          <li>Highlight any attachments or accessories</li>
          <li>Include photos showing the current condition</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 me-1" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Continue
          <ChevronRight className="w-4 h-4 ms-1" />
        </Button>
      </div>
    </div>
  );
}
