"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { CategoryStep } from "@/components/features/equipment/category-step";
import { PhotosStep } from "@/components/features/equipment/photos-step";
import { DetailsStep } from "@/components/features/equipment/details-step";
import { SpecsStep } from "@/components/features/equipment/specs-step";
import { PricingStep } from "@/components/features/equipment/pricing-step";
import { ReviewStep } from "@/components/features/equipment/review-step";

const STEPS = [
  { id: 1, name: "Category", description: "Select equipment type" },
  { id: 2, name: "Photos", description: "Upload equipment images" },
  { id: 3, name: "Details", description: "Basic information" },
  { id: 4, name: "Specifications", description: "Technical specs" },
  { id: 5, name: "Pricing", description: "Set price & contact" },
  { id: 6, name: "Review", description: "Review and submit" },
];

export interface EquipmentFormData {
  // Step 1: Category
  categoryId: string;
  categoryName: string;

  // Step 2: Photos (with AI classification)
  images: Array<{
    url: string;
    file?: File;
    isPrimary: boolean;
    order: number;
  }>;
  aiClassification: {
    category?: string;
    make?: string;
    model?: string;
    yearEstimate?: number;
    condition?: string;
    features?: string[];
    confidence?: number;
  } | null;

  // Step 3: Details
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  make: string;
  model: string;
  year: number | undefined;
  condition: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  hoursUsed: number | null;

  // Step 4: Specs
  specifications: Record<string, string | number | boolean>;

  // Step 5: Pricing, Location & Contact (Classifieds model)
  listingType: "FOR_RENT" | "FOR_SALE" | "BOTH";
  rentalPrice: number | undefined;
  rentalPriceUnit: string;
  salePrice: number | undefined;
  priceOnRequest: boolean;
  currency: "SAR" | "BHD";
  city: string;
  region: string;
  country: "SA" | "BH";
  contactPhone: string;
  contactWhatsApp: string | undefined;
}

const initialFormData: EquipmentFormData = {
  categoryId: "",
  categoryName: "",
  images: [],
  aiClassification: null,
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  make: "",
  model: "",
  year: undefined,
  condition: "GOOD",
  hoursUsed: null,
  specifications: {},
  listingType: "FOR_RENT",
  rentalPrice: undefined,
  rentalPriceUnit: "day",
  salePrice: undefined,
  priceOnRequest: false,
  currency: "SAR",
  city: "",
  region: "",
  country: "SA",
  contactPhone: "",
  contactWhatsApp: undefined,
};

export default function NewEquipmentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EquipmentFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = (currentStep / STEPS.length) * 100;

  const updateFormData = (data: Partial<EquipmentFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: formData.categoryId,
          titleEn: formData.titleEn,
          titleAr: formData.titleAr || undefined,
          descriptionEn: formData.descriptionEn,
          descriptionAr: formData.descriptionAr || undefined,
          make: formData.make,
          model: formData.model,
          year: formData.year || undefined,
          condition: formData.condition,
          hoursUsed: formData.hoursUsed || undefined,
          specifications: formData.specifications,
          // Classifieds pricing
          listingType: formData.listingType,
          rentalPrice: formData.rentalPrice || undefined,
          rentalPriceUnit: formData.rentalPriceUnit,
          salePrice: formData.salePrice || undefined,
          priceOnRequest: formData.priceOnRequest,
          currency: formData.currency,
          // Location
          locationCity: formData.city,
          locationRegion: formData.region,
          locationCountry: formData.country,
          // Contact
          contactPhone: formData.contactPhone,
          contactWhatsApp: formData.contactWhatsApp || undefined,
          // Images
          images: formData.images.map((img) => ({
            url: img.url,
            isPrimary: img.isPrimary,
            sortOrder: img.order,
          })),
          // AI metadata
          aiClassified: !!formData.aiClassification,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create listing");
      }

      const result = await response.json();
      router.push(`/equipment/${result.equipmentId}?created=true`);
    } catch (error) {
      console.error("Submit error:", error);
      alert(error instanceof Error ? error.message : "Failed to create listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CategoryStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <PhotosStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <DetailsStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <SpecsStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 5:
        return (
          <PricingStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 6:
        return (
          <ReviewStep
            formData={formData}
            onBack={prevStep}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4 me-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">List Your Equipment</h1>
        <p className="text-muted-foreground">
          Post your equipment for rent or sale - it only takes a few minutes
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`text-xs ${
                step.id === currentStep
                  ? "text-primary font-medium"
                  : step.id < currentStep
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
              }`}
            >
              <span className="hidden sm:inline">{step.name}</span>
              <span className="sm:hidden">{step.id}</span>
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground mt-2">
          Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].description}
        </p>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">{renderStep()}</CardContent>
      </Card>
    </div>
  );
}
