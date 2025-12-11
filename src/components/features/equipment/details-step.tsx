"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronRight, ChevronLeft, Sparkles, Loader2 } from "lucide-react";
import type { EquipmentFormData } from "@/app/(dashboard)/equipment/new/page";

interface DetailsStepProps {
  formData: EquipmentFormData;
  updateFormData: (data: Partial<EquipmentFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const CONDITIONS = [
  { value: "EXCELLENT", label: "Excellent", description: "Like new, minimal wear" },
  { value: "GOOD", label: "Good", description: "Normal wear, fully functional" },
  { value: "FAIR", label: "Fair", description: "Visible wear, works well" },
  { value: "POOR", label: "Poor", description: "Heavy wear, needs attention" },
];

export function DetailsStep({ formData, updateFormData, onNext, onBack }: DetailsStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Pre-fill from AI classification if available
  useEffect(() => {
    if (formData.aiClassification && !formData.make) {
      updateFormData({
        make: formData.aiClassification.make || "",
        model: formData.aiClassification.model || "",
        year: formData.aiClassification.yearEstimate || new Date().getFullYear(),
        condition: (formData.aiClassification.condition?.toUpperCase() as "EXCELLENT" | "GOOD" | "FAIR" | "POOR") || "GOOD",
      });
    }
  }, []);

  const generateContent = async () => {
    if (!formData.make || !formData.model) {
      setGenerateError("Please enter make and model first");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch("/api/ai/generate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formData.categoryName,
          make: formData.make,
          model: formData.model,
          year: formData.year,
          condition: formData.condition.toLowerCase(),
          features: formData.aiClassification?.features || [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        updateFormData({
          titleEn: data.content.titleEn,
          titleAr: data.content.titleAr,
          descriptionEn: data.content.descriptionEn,
          descriptionAr: data.content.descriptionAr,
        });
      } else {
        const error = await response.json();
        setGenerateError(error.error || "Failed to generate content");
      }
    } catch (error) {
      console.error("Generate error:", error);
      setGenerateError("Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  const canProceed =
    formData.make &&
    formData.model &&
    formData.year &&
    formData.titleEn &&
    formData.descriptionEn;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Equipment Details</h2>
        <p className="text-muted-foreground">
          Tell us about your equipment. AI can help generate titles and descriptions.
        </p>
      </div>

      {/* Basic Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="make">Make / Brand *</Label>
          <Input
            id="make"
            placeholder="e.g., Caterpillar, Komatsu, JCB"
            value={formData.make}
            onChange={(e) => updateFormData({ make: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model *</Label>
          <Input
            id="model"
            placeholder="e.g., 320, PC200, 3CX"
            value={formData.model}
            onChange={(e) => updateFormData({ model: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="year">Year *</Label>
          <Input
            id="year"
            type="number"
            min={1990}
            max={new Date().getFullYear() + 1}
            value={formData.year ?? ""}
            onChange={(e) => updateFormData({ year: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="condition">Condition *</Label>
          <Select
            value={formData.condition}
            onValueChange={(value) =>
              updateFormData({ condition: value as "EXCELLENT" | "GOOD" | "FAIR" | "POOR" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  <div>
                    <span className="font-medium">{c.label}</span>
                    <span className="text-muted-foreground ms-2 text-sm">
                      - {c.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="hours">Hours Used (optional)</Label>
          <Input
            id="hours"
            type="number"
            min={0}
            placeholder="e.g., 5000"
            value={formData.hoursUsed || ""}
            onChange={(e) =>
              updateFormData({ hoursUsed: e.target.value ? parseInt(e.target.value) : null })
            }
          />
        </div>
      </div>

      {/* AI Content Generation */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Content Generator
            </h3>
            <p className="text-sm text-muted-foreground">
              Generate professional titles and descriptions in English and Arabic
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateContent}
            disabled={isGenerating || !formData.make || !formData.model}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 me-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 me-1" />
                Generate
              </>
            )}
          </Button>
        </div>

        {generateError && (
          <Alert variant="destructive">
            <AlertDescription>{generateError}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Title & Description */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="titleEn">Listing Title (English) *</Label>
          <Input
            id="titleEn"
            placeholder="e.g., 2020 Caterpillar 320 Excavator - Excellent Condition"
            value={formData.titleEn}
            onChange={(e) => updateFormData({ titleEn: e.target.value })}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            {formData.titleEn.length}/100 characters
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="titleAr">Listing Title (Arabic)</Label>
          <Input
            id="titleAr"
            dir="rtl"
            placeholder="عنوان الإعلان بالعربية"
            value={formData.titleAr}
            onChange={(e) => updateFormData({ titleAr: e.target.value })}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="descriptionEn">Description (English) *</Label>
          <Textarea
            id="descriptionEn"
            placeholder="Describe your equipment in detail. Include features, attachments, maintenance history, etc."
            value={formData.descriptionEn}
            onChange={(e) => updateFormData({ descriptionEn: e.target.value })}
            rows={5}
            maxLength={5000}
          />
          <p className="text-xs text-muted-foreground">
            {formData.descriptionEn.length}/5000 characters (minimum 50)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="descriptionAr">Description (Arabic)</Label>
          <Textarea
            id="descriptionAr"
            dir="rtl"
            placeholder="وصف المعدات بالعربية"
            value={formData.descriptionAr}
            onChange={(e) => updateFormData({ descriptionAr: e.target.value })}
            rows={5}
            maxLength={5000}
          />
        </div>
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
