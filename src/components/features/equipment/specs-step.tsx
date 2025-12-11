"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, ChevronLeft, Plus, X } from "lucide-react";
import type { EquipmentFormData } from "@/app/(dashboard)/equipment/new/page";

interface SpecsStepProps {
  formData: EquipmentFormData;
  updateFormData: (data: Partial<EquipmentFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Common specs by category type
const COMMON_SPECS: Record<string, Array<{ key: string; label: string; type: "number" | "text" | "boolean" }>> = {
  excavators: [
    { key: "operatingWeight", label: "Operating Weight (kg)", type: "number" },
    { key: "bucketCapacity", label: "Bucket Capacity (m³)", type: "number" },
    { key: "maxDigDepth", label: "Max Dig Depth (m)", type: "number" },
    { key: "enginePower", label: "Engine Power (HP)", type: "number" },
    { key: "hasAC", label: "Air Conditioning", type: "boolean" },
    { key: "hasGPS", label: "GPS Tracking", type: "boolean" },
    { key: "hasQuickCoupler", label: "Quick Coupler", type: "boolean" },
  ],
  "wheel-loaders": [
    { key: "operatingWeight", label: "Operating Weight (kg)", type: "number" },
    { key: "bucketCapacity", label: "Bucket Capacity (m³)", type: "number" },
    { key: "enginePower", label: "Engine Power (HP)", type: "number" },
    { key: "maxLiftHeight", label: "Max Lift Height (m)", type: "number" },
    { key: "hasAC", label: "Air Conditioning", type: "boolean" },
  ],
  cranes: [
    { key: "maxLiftCapacity", label: "Max Lift Capacity (tons)", type: "number" },
    { key: "maxBoomLength", label: "Max Boom Length (m)", type: "number" },
    { key: "maxLiftHeight", label: "Max Lift Height (m)", type: "number" },
    { key: "counterweight", label: "Counterweight (tons)", type: "number" },
  ],
  generators: [
    { key: "ratedPower", label: "Rated Power (kVA)", type: "number" },
    { key: "voltage", label: "Voltage (V)", type: "number" },
    { key: "fuelType", label: "Fuel Type", type: "text" },
    { key: "fuelCapacity", label: "Fuel Tank Capacity (L)", type: "number" },
    { key: "isSilent", label: "Silent Type", type: "boolean" },
  ],
  default: [
    { key: "enginePower", label: "Engine Power (HP)", type: "number" },
    { key: "operatingWeight", label: "Operating Weight (kg)", type: "number" },
    { key: "fuelType", label: "Fuel Type", type: "text" },
    { key: "hasAC", label: "Air Conditioning", type: "boolean" },
  ],
};

// Map AI-detected features to specification keys
const FEATURE_TO_SPEC_MAP: Record<string, string> = {
  "air conditioning": "hasAC",
  "ac": "hasAC",
  "a/c": "hasAC",
  "gps": "hasGPS",
  "gps tracking": "hasGPS",
  "quick coupler": "hasQuickCoupler",
  "quick-coupler": "hasQuickCoupler",
  "silent": "isSilent",
  "silent type": "isSilent",
};

export function SpecsStep({ formData, updateFormData, onNext, onBack }: SpecsStepProps) {
  const [customSpecKey, setCustomSpecKey] = useState("");
  const [customSpecValue, setCustomSpecValue] = useState("");

  // Determine which specs to show based on category
  const categorySlug = formData.categoryName.toLowerCase().replace(/\s+/g, "-");
  const specs = COMMON_SPECS[categorySlug] || COMMON_SPECS.default;

  // Auto-populate boolean specs from AI-detected features on mount
  useEffect(() => {
    if (formData.aiClassification?.features && formData.aiClassification.features.length > 0) {
      const specsToUpdate: Record<string, boolean> = {};

      for (const feature of formData.aiClassification.features) {
        const featureLower = feature.toLowerCase();
        const specKey = FEATURE_TO_SPEC_MAP[featureLower];
        if (specKey) {
          specsToUpdate[specKey] = true;
        }
      }

      if (Object.keys(specsToUpdate).length > 0) {
        updateFormData({
          specifications: {
            ...formData.specifications,
            ...specsToUpdate,
          },
        });
      }
    }
  }, []);

  const updateSpec = (key: string, value: string | number | boolean) => {
    updateFormData({
      specifications: {
        ...formData.specifications,
        [key]: value,
      },
    });
  };

  const removeSpec = (key: string) => {
    const newSpecs = { ...formData.specifications };
    delete newSpecs[key];
    updateFormData({ specifications: newSpecs });
  };

  const addCustomSpec = () => {
    if (customSpecKey && customSpecValue) {
      updateSpec(customSpecKey, customSpecValue);
      setCustomSpecKey("");
      setCustomSpecValue("");
    }
  };

  // Get custom specs (ones not in the common list)
  const commonKeys = specs.map((s) => s.key);
  const customSpecs = Object.entries(formData.specifications).filter(
    ([key]) => !commonKeys.includes(key)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Specifications</h2>
        <p className="text-muted-foreground">
          Add technical specifications to help renters find the right equipment
        </p>
      </div>

      {/* Common Specs */}
      <div className="space-y-4">
        <h3 className="font-medium">Common Specifications</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {specs.map((spec) => (
            <div key={spec.key} className="space-y-2">
              {spec.type === "boolean" ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={spec.key}
                    checked={!!formData.specifications[spec.key]}
                    onCheckedChange={(checked) => updateSpec(spec.key, !!checked)}
                  />
                  <Label htmlFor={spec.key} className="cursor-pointer">
                    {spec.label}
                  </Label>
                </div>
              ) : (
                <>
                  <Label htmlFor={spec.key}>{spec.label}</Label>
                  <Input
                    id={spec.key}
                    type={spec.type}
                    value={(formData.specifications[spec.key] as string | number) || ""}
                    onChange={(e) =>
                      updateSpec(
                        spec.key,
                        spec.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value
                      )
                    }
                    placeholder={`Enter ${spec.label.toLowerCase()}`}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Custom Specs */}
      <div className="space-y-4">
        <h3 className="font-medium">Additional Specifications</h3>

        {/* Existing custom specs */}
        {customSpecs.length > 0 && (
          <div className="space-y-2">
            {customSpecs.map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between bg-muted rounded-lg px-3 py-2"
              >
                <div>
                  <span className="font-medium">{key}:</span>{" "}
                  <span>{String(value)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSpec(key)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add custom spec */}
        <div className="flex gap-2">
          <Input
            placeholder="Specification name"
            value={customSpecKey}
            onChange={(e) => setCustomSpecKey(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Value"
            value={customSpecValue}
            onChange={(e) => setCustomSpecValue(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={addCustomSpec}
            disabled={!customSpecKey || !customSpecValue}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Add any other relevant specifications not listed above
        </p>
      </div>

      {/* AI-detected features */}
      {formData.aiClassification?.features && formData.aiClassification.features.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">AI-Detected Features</h4>
          <div className="flex flex-wrap gap-2">
            {formData.aiClassification.features.map((feature, index) => (
              <span
                key={index}
                className="bg-background px-2 py-1 rounded text-sm"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 me-1" />
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
          <ChevronRight className="w-4 h-4 ms-1" />
        </Button>
      </div>
    </div>
  );
}
