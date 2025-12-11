"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { BusinessTypeStep } from "@/components/features/onboarding/business-type-step";
import { CompanyDetailsStep } from "@/components/features/onboarding/company-details-step";
import { DocumentUploadStep } from "@/components/features/onboarding/document-upload-step";
import { BankDetailsStep } from "@/components/features/onboarding/bank-details-step";
import { ReviewStep } from "@/components/features/onboarding/review-step";

export type BusinessType = "INDIVIDUAL" | "RENTAL_COMPANY" | "CONTRACTOR" | "INDUSTRIAL";

export interface OnboardingData {
  // Step 1: Business Type
  businessType: BusinessType | null;

  // Step 2: Company Details
  companyNameEn: string;
  companyNameAr: string;
  crNumber: string;
  vatNumber: string;
  city: string;
  address: string;

  // Step 3: Documents
  crDocumentUrl: string | null;
  vatDocumentUrl: string | null;

  // Step 4: Bank Details
  bankName: string;
  accountHolderName: string;
  iban: string;
}

const STEPS = [
  { id: 1, title: "Business Type", description: "What type of business are you?" },
  { id: 2, title: "Company Details", description: "Tell us about your company" },
  { id: 3, title: "Documents", description: "Upload verification documents" },
  { id: 4, title: "Bank Details", description: "Where should we send payouts?" },
  { id: 5, title: "Review", description: "Review and submit" },
];

const initialData: OnboardingData = {
  businessType: null,
  companyNameEn: "",
  companyNameAr: "",
  crNumber: "",
  vatNumber: "",
  city: "",
  address: "",
  crDocumentUrl: null,
  vatDocumentUrl: null,
  bankName: "",
  accountHolderName: "",
  iban: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user already has a business profile
  useEffect(() => {
    if (status === "authenticated" && session?.user?.businessProfileId) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  const progress = (currentStep / STEPS.length) * 100;

  function updateData(updates: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...updates }));
  }

  function nextStep() {
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/business-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create business profile");
      }

      toast.success("Business profile submitted for verification!");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Business Verification</h1>
        <p className="text-muted-foreground mb-4">
          Complete your business profile to start listing equipment
        </p>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>Step {currentStep} of {STEPS.length}</span>
          <span>{STEPS[currentStep - 1].title}</span>
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <BusinessTypeStep
              data={data}
              updateData={updateData}
              onNext={nextStep}
            />
          )}
          {currentStep === 2 && (
            <CompanyDetailsStep
              data={data}
              updateData={updateData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 3 && (
            <DocumentUploadStep
              data={data}
              updateData={updateData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 4 && (
            <BankDetailsStep
              data={data}
              updateData={updateData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 5 && (
            <ReviewStep
              data={data}
              onBack={prevStep}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </CardContent>
      </Card>

      {/* Step Indicators */}
      <div className="flex justify-center gap-2 mt-6">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`w-2 h-2 rounded-full transition-colors ${
              step.id === currentStep
                ? "bg-primary"
                : step.id < currentStep
                ? "bg-primary/50"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
