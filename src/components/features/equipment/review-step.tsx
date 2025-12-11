"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  Loader2,
  Check,
  MapPin,
  Phone,
  MessageCircle,
  Sparkles,
  Tag,
} from "lucide-react";
import Image from "next/image";
import type { EquipmentFormData } from "@/app/(dashboard)/equipment/new/page";

interface ReviewStepProps {
  formData: EquipmentFormData;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ReviewStep({ formData, onBack, onSubmit, isSubmitting }: ReviewStepProps) {
  const formatPrice = (amount: number | undefined) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency: formData.currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const conditionLabels: Record<string, string> = {
    EXCELLENT: "Excellent",
    GOOD: "Good",
    FAIR: "Fair",
    POOR: "Poor",
  };

  const listingTypeLabels: Record<string, string> = {
    FOR_RENT: "For Rent",
    FOR_SALE: "For Sale",
    BOTH: "For Rent & Sale",
  };

  const rentalUnitLabels: Record<string, string> = {
    day: "per day",
    week: "per week",
    month: "per month",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Review Your Listing</h2>
        <p className="text-muted-foreground">
          Please review all details before submitting. Your listing will go live immediately!
        </p>
      </div>

      {/* Images Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Photos ({formData.images.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {formData.images.map((image, index) => (
              <div
                key={index}
                className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-muted"
              >
                <Image
                  src={image.url}
                  alt={`Photo ${index + 1}`}
                  fill
                  className="object-cover"
                />
                {image.isPrimary && (
                  <Badge className="absolute top-1 start-1 text-xs px-1">
                    Primary
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Equipment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{formData.titleEn}</h3>
            {formData.titleAr && (
              <p className="text-muted-foreground" dir="rtl">
                {formData.titleAr}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Category</span>
              <p className="font-medium">{formData.categoryName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Make</span>
              <p className="font-medium">{formData.make}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Model</span>
              <p className="font-medium">{formData.model}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Year</span>
              <p className="font-medium">{formData.year}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Condition</span>
              <p className="font-medium">{conditionLabels[formData.condition]}</p>
            </div>
            {formData.hoursUsed && (
              <div>
                <span className="text-muted-foreground">Hours Used</span>
                <p className="font-medium">{formData.hoursUsed.toLocaleString()}</p>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <span className="text-muted-foreground text-sm">Description</span>
            <p className="mt-1 text-sm whitespace-pre-wrap">{formData.descriptionEn}</p>
          </div>
        </CardContent>
      </Card>

      {/* Specifications */}
      {Object.keys(formData.specifications).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {Object.entries(formData.specifications).map(([key, value]) => (
                <div key={key}>
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  <p className="font-medium">
                    {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Pricing - {listingTypeLabels[formData.listingType]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formData.priceOnRequest ? (
            <p className="text-muted-foreground">Contact for price</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {(formData.listingType === "FOR_RENT" || formData.listingType === "BOTH") &&
                formData.rentalPrice && (
                  <div className="bg-primary/5 rounded-lg p-4">
                    <span className="text-muted-foreground text-sm">Rental Price</span>
                    <p className="font-bold text-lg">
                      {formatPrice(formData.rentalPrice)}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        {rentalUnitLabels[formData.rentalPriceUnit]}
                      </span>
                    </p>
                  </div>
                )}
              {(formData.listingType === "FOR_SALE" || formData.listingType === "BOTH") &&
                formData.salePrice && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <span className="text-muted-foreground text-sm">Sale Price</span>
                    <p className="font-bold text-lg text-green-700">
                      {formatPrice(formData.salePrice)}
                    </p>
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location & Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Location & Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>
              {formData.city}, {formData.region}, {formData.country === "SA" ? "Saudi Arabia" : "Bahrain"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span>{formData.contactPhone}</span>
          </div>

          {formData.contactWhatsApp && (
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-600" />
              <span>{formData.contactWhatsApp}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Classification */}
      {formData.aiClassification && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">
              AI detected this as a {formData.aiClassification.make} {formData.aiClassification.model}
              {formData.aiClassification.yearEstimate && ` (${formData.aiClassification.yearEstimate})`}
              {formData.aiClassification.confidence && (
                <Badge variant="secondary" className="ms-2">
                  {Math.round(formData.aiClassification.confidence * 100)}% confidence
                </Badge>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submit Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-800 mb-1">Ready to go live!</h4>
        <p className="text-sm text-green-700">
          Your listing will be published immediately. Interested buyers will be able to contact you directly via phone or WhatsApp.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ChevronLeft className="w-4 h-4 me-1" />
          Back
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 me-1 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 me-1" />
              Publish Listing
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
