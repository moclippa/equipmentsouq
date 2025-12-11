"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronRight, ChevronLeft, MapPin, Phone, MessageCircle, Tag, Sparkles, Loader2 } from "lucide-react";
import type { EquipmentFormData } from "@/app/(dashboard)/equipment/new/page";

interface PricingStepProps {
  formData: EquipmentFormData;
  updateFormData: (data: Partial<EquipmentFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const SA_CITIES = [
  "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Dhahran",
  "Jubail", "Yanbu", "Tabuk", "Abha", "Khamis Mushait", "Taif", "Hail",
  "Najran", "Jizan", "Al Ahsa", "Qatif", "Hofuf", "Buraidah"
];

const BH_CITIES = [
  "Manama", "Riffa", "Muharraq", "Hamad Town", "Isa Town", "Sitra",
  "Budaiya", "Jidhafs", "Al Hidd"
];

const SA_REGIONS = ["Central", "Western", "Eastern", "Northern", "Southern"];
const BH_REGIONS = ["Capital", "Northern", "Southern", "Muharraq"];

interface PriceSuggestion {
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  confidence: number;
  reasoning: string;
}

export function PricingStep({ formData, updateFormData, onNext, onBack }: PricingStepProps) {
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const cities = formData.country === "SA" ? SA_CITIES : BH_CITIES;
  const regions = formData.country === "SA" ? SA_REGIONS : BH_REGIONS;

  const fetchPriceSuggestion = async () => {
    if (!formData.make || !formData.model || !formData.year) {
      setSuggestionError("Equipment details (make, model, year) are required");
      return;
    }

    setIsLoadingSuggestion(true);
    setSuggestionError(null);

    try {
      const response = await fetch("/api/ai/suggest-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formData.categoryName.toLowerCase().replace(/\s+/g, "-"),
          make: formData.make,
          model: formData.model,
          year: formData.year,
          condition: formData.condition.toLowerCase(),
          country: formData.country,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPriceSuggestion(data.suggestion);
      } else {
        const error = await response.json();
        setSuggestionError(error.error || "Failed to get price suggestion");
      }
    } catch (error) {
      console.error("Price suggestion error:", error);
      setSuggestionError("Failed to get price suggestion");
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  const applyRentalSuggestion = (rate: number, unit: string) => {
    updateFormData({ rentalPrice: rate, rentalPriceUnit: unit });
  };

  const canProceed =
    formData.listingType &&
    formData.city &&
    formData.region &&
    formData.contactPhone &&
    (formData.priceOnRequest ||
      (formData.listingType === "FOR_RENT" && formData.rentalPrice) ||
      (formData.listingType === "FOR_SALE" && formData.salePrice) ||
      (formData.listingType === "BOTH" && (formData.rentalPrice || formData.salePrice)));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Pricing & Contact</h2>
        <p className="text-muted-foreground">
          Set your price and how people can contact you
        </p>
      </div>

      {/* Listing Type */}
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Tag className="w-4 h-4" />
          What do you want to do with this equipment? *
        </h3>
        <RadioGroup
          value={formData.listingType}
          onValueChange={(value) => updateFormData({ listingType: value as "FOR_RENT" | "FOR_SALE" | "BOTH" })}
          className="grid gap-3 sm:grid-cols-3"
        >
          <label
            htmlFor="rent"
            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
              formData.listingType === "FOR_RENT"
                ? "border-primary bg-primary/5"
                : "hover:border-muted-foreground/50"
            }`}
          >
            <RadioGroupItem value="FOR_RENT" id="rent" />
            <div>
              <p className="font-medium">For Rent</p>
              <p className="text-sm text-muted-foreground">Rent it out</p>
            </div>
          </label>
          <label
            htmlFor="sale"
            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
              formData.listingType === "FOR_SALE"
                ? "border-primary bg-primary/5"
                : "hover:border-muted-foreground/50"
            }`}
          >
            <RadioGroupItem value="FOR_SALE" id="sale" />
            <div>
              <p className="font-medium">For Sale</p>
              <p className="text-sm text-muted-foreground">Sell it</p>
            </div>
          </label>
          <label
            htmlFor="both"
            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
              formData.listingType === "BOTH"
                ? "border-primary bg-primary/5"
                : "hover:border-muted-foreground/50"
            }`}
          >
            <RadioGroupItem value="BOTH" id="both" />
            <div>
              <p className="font-medium">Both</p>
              <p className="text-sm text-muted-foreground">Rent or sell</p>
            </div>
          </label>
        </RadioGroup>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Pricing ({formData.currency})</h3>
          {(formData.listingType === "FOR_RENT" || formData.listingType === "BOTH") && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPriceSuggestion}
              disabled={isLoadingSuggestion || !formData.make || !formData.model}
            >
              {isLoadingSuggestion ? (
                <>
                  <Loader2 className="w-4 h-4 me-1 animate-spin" />
                  Getting prices...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 me-1" />
                  Suggest Rental Prices
                </>
              )}
            </Button>
          )}
        </div>

        {/* AI Price Suggestion */}
        {suggestionError && (
          <Alert variant="destructive">
            <AlertDescription>{suggestionError}</AlertDescription>
          </Alert>
        )}

        {priceSuggestion && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="w-4 h-4" />
              AI-Suggested Rental Prices
              <span className="text-xs text-muted-foreground">
                ({Math.round(priceSuggestion.confidence * 100)}% confidence)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyRentalSuggestion(priceSuggestion.dailyRate, "day")}
                className="p-2 rounded border bg-background hover:border-primary transition-colors text-center"
              >
                <div className="text-lg font-semibold">{priceSuggestion.dailyRate.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{formData.currency}/day</div>
              </button>
              <button
                type="button"
                onClick={() => applyRentalSuggestion(priceSuggestion.weeklyRate, "week")}
                className="p-2 rounded border bg-background hover:border-primary transition-colors text-center"
              >
                <div className="text-lg font-semibold">{priceSuggestion.weeklyRate.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{formData.currency}/week</div>
              </button>
              <button
                type="button"
                onClick={() => applyRentalSuggestion(priceSuggestion.monthlyRate, "month")}
                className="p-2 rounded border bg-background hover:border-primary transition-colors text-center"
              >
                <div className="text-lg font-semibold">{priceSuggestion.monthlyRate.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{formData.currency}/month</div>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{priceSuggestion.reasoning}</p>
            <p className="text-xs text-muted-foreground italic">Click a price to apply it</p>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <Checkbox
            id="priceOnRequest"
            checked={formData.priceOnRequest}
            onCheckedChange={(checked) => updateFormData({ priceOnRequest: !!checked })}
          />
          <Label htmlFor="priceOnRequest" className="cursor-pointer">
            Contact for price (don&apos;t show price publicly)
          </Label>
        </div>

        {!formData.priceOnRequest && (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Rental Price */}
            {(formData.listingType === "FOR_RENT" || formData.listingType === "BOTH") && (
              <div className="space-y-2">
                <Label htmlFor="rentalPrice">
                  Rental Price {formData.listingType === "FOR_RENT" ? "*" : ""}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="rentalPrice"
                      type="number"
                      min={0}
                      placeholder="e.g., 500"
                      value={formData.rentalPrice || ""}
                      onChange={(e) => updateFormData({ rentalPrice: parseFloat(e.target.value) || undefined })}
                      className="pe-16"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {formData.currency}
                    </span>
                  </div>
                  <Select
                    value={formData.rentalPriceUnit}
                    onValueChange={(value) => updateFormData({ rentalPriceUnit: value })}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">/day</SelectItem>
                      <SelectItem value="week">/week</SelectItem>
                      <SelectItem value="month">/month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Sale Price */}
            {(formData.listingType === "FOR_SALE" || formData.listingType === "BOTH") && (
              <div className="space-y-2">
                <Label htmlFor="salePrice">
                  Sale Price {formData.listingType === "FOR_SALE" ? "*" : ""}
                </Label>
                <div className="relative">
                  <Input
                    id="salePrice"
                    type="number"
                    min={0}
                    placeholder="e.g., 50000"
                    value={formData.salePrice || ""}
                    onChange={(e) => updateFormData({ salePrice: parseFloat(e.target.value) || undefined })}
                    className="pe-16"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {formData.currency}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Location */}
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Equipment Location
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Select
              value={formData.country}
              onValueChange={(value) => {
                updateFormData({
                  country: value as "SA" | "BH",
                  currency: value === "SA" ? "SAR" : "BHD",
                  city: "",
                  region: "",
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SA">Saudi Arabia</SelectItem>
                <SelectItem value="BH">Bahrain</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Region *</Label>
            <Select
              value={formData.region}
              onValueChange={(value) => updateFormData({ region: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Select
              value={formData.city}
              onValueChange={(value) => updateFormData({ city: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Contact Information
        </h3>
        <p className="text-sm text-muted-foreground">
          This is how interested buyers/renters will reach you
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Phone Number *</Label>
            <Input
              id="contactPhone"
              type="tel"
              placeholder={formData.country === "SA" ? "+966 5XX XXX XXXX" : "+973 XXX XXXXX"}
              value={formData.contactPhone}
              onChange={(e) => updateFormData({ contactPhone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactWhatsApp" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-600" />
              WhatsApp (optional)
            </Label>
            <Input
              id="contactWhatsApp"
              type="tel"
              placeholder="Same as phone or different"
              value={formData.contactWhatsApp || ""}
              onChange={(e) => updateFormData({ contactWhatsApp: e.target.value || undefined })}
            />
          </div>
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
