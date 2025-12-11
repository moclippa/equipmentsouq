"use client";

import { Button } from "@/components/ui/button";
import { Building2, User, HardHat, Factory } from "lucide-react";
import type { OnboardingData, BusinessType } from "@/app/(dashboard)/onboarding/page";

interface BusinessTypeStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const BUSINESS_TYPES: {
  value: BusinessType;
  label: string;
  labelAr: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "INDIVIDUAL",
    label: "Individual Owner",
    labelAr: "مالك فردي",
    description: "I own equipment personally and want to rent it out",
    icon: User,
  },
  {
    value: "RENTAL_COMPANY",
    label: "Rental Company",
    labelAr: "شركة تأجير",
    description: "We are an established equipment rental business",
    icon: Building2,
  },
  {
    value: "CONTRACTOR",
    label: "Contractor",
    labelAr: "مقاول",
    description: "Construction company with idle equipment to rent",
    icon: HardHat,
  },
  {
    value: "INDUSTRIAL",
    label: "Industrial Company",
    labelAr: "شركة صناعية",
    description: "Industrial business with surplus equipment",
    icon: Factory,
  },
];

export function BusinessTypeStep({ data, updateData, onNext }: BusinessTypeStepProps) {
  const canProceed = data.businessType !== null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {BUSINESS_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = data.businessType === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => updateData({ businessType: type.value })}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 text-start transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{type.label}</div>
                <div className="text-sm text-muted-foreground">{type.description}</div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 shrink-0 mt-1 ${
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}
              >
                {isSelected && (
                  <svg
                    className="w-full h-full text-primary-foreground p-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={!canProceed}>
          Continue
        </Button>
      </div>
    </div>
  );
}
