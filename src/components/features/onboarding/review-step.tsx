"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Building2, FileText, CreditCard, AlertCircle } from "lucide-react";
import type { OnboardingData, BusinessType } from "@/app/(dashboard)/onboarding/page";

interface ReviewStepProps {
  data: OnboardingData;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  INDIVIDUAL: "Individual Owner",
  RENTAL_COMPANY: "Rental Company",
  CONTRACTOR: "Contractor",
  INDUSTRIAL: "Industrial Company",
};

function ReviewSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-medium">{title}</h3>
      </div>
      <div className="ps-6 space-y-2 text-sm">{children}</div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

export function ReviewStep({ data, onBack, onSubmit, isSubmitting }: ReviewStepProps) {
  const isComplete =
    data.businessType &&
    data.companyNameEn &&
    data.crNumber &&
    data.city &&
    data.address &&
    data.crDocumentUrl &&
    data.bankName &&
    data.accountHolderName &&
    data.iban;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="space-y-4">
        <ReviewSection icon={Building2} title="Business Information">
          <ReviewItem label="Business Type" value={data.businessType ? BUSINESS_TYPE_LABELS[data.businessType] : null} />
          <ReviewItem label="Company Name" value={data.companyNameEn} />
          {data.companyNameAr && <ReviewItem label="Company Name (Arabic)" value={data.companyNameAr} />}
          <ReviewItem label="CR Number" value={data.crNumber} />
          {data.vatNumber && <ReviewItem label="VAT Number" value={data.vatNumber} />}
          <ReviewItem label="City" value={data.city} />
          <ReviewItem label="Address" value={data.address} />
        </ReviewSection>

        <Separator />

        <ReviewSection icon={FileText} title="Documents">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">CR Document</span>
            {data.crDocumentUrl ? (
              <span className="text-green-600 flex items-center gap-1 text-sm">
                <CheckCircle className="w-3 h-3" />
                Uploaded
              </span>
            ) : (
              <span className="text-destructive flex items-center gap-1 text-sm">
                <AlertCircle className="w-3 h-3" />
                Missing
              </span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">VAT Certificate</span>
            {data.vatDocumentUrl ? (
              <span className="text-green-600 flex items-center gap-1 text-sm">
                <CheckCircle className="w-3 h-3" />
                Uploaded
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">Not provided</span>
            )}
          </div>
        </ReviewSection>

        <Separator />

        <ReviewSection icon={CreditCard} title="Bank Details">
          <ReviewItem label="Bank" value={data.bankName} />
          <ReviewItem label="Account Holder" value={data.accountHolderName} />
          <ReviewItem
            label="IBAN"
            value={data.iban ? `${data.iban.slice(0, 4)}****${data.iban.slice(-4)}` : null}
          />
        </ReviewSection>
      </div>

      {/* What happens next */}
      <div className="bg-muted rounded-lg p-4 space-y-2">
        <h4 className="font-medium">What happens next?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">1.</span>
            Our team will review your documents within 1-2 business days
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">2.</span>
            You&apos;ll receive an email once your profile is verified
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">3.</span>
            After verification, you can start listing your equipment
          </li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button onClick={onSubmit} disabled={!isComplete || isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit for Verification"}
        </Button>
      </div>
    </div>
  );
}
