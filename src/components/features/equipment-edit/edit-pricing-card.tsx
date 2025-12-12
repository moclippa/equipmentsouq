"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ListingType = "FOR_RENT" | "FOR_SALE" | "BOTH";
type PricingField = "listingType" | "priceOnRequest" | "rentalPrice" | "rentalPriceUnit" | "salePrice";

interface EditPricingCardProps {
  listingType: ListingType;
  priceOnRequest: boolean;
  rentalPrice: number | null;
  rentalPriceUnit: string;
  salePrice: number | null;
  onUpdate: (field: PricingField, value: string | number | boolean | null) => void;
}

export function EditPricingCard({
  listingType,
  priceOnRequest,
  rentalPrice,
  rentalPriceUnit,
  salePrice,
  onUpdate,
}: EditPricingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Listing Type</Label>
          <Select
            value={listingType}
            onValueChange={(value) => onUpdate("listingType", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FOR_RENT">For Rent</SelectItem>
              <SelectItem value="FOR_SALE">For Sale</SelectItem>
              <SelectItem value="BOTH">Both Rent & Sale</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="priceOnRequest"
            checked={priceOnRequest}
            onCheckedChange={(checked) => onUpdate("priceOnRequest", !!checked)}
          />
          <Label htmlFor="priceOnRequest" className="cursor-pointer">
            Contact for price
          </Label>
        </div>

        {!priceOnRequest && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(listingType === "FOR_RENT" || listingType === "BOTH") && (
              <div className="space-y-2">
                <Label>Rental Price</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={rentalPrice || ""}
                    onChange={(e) => onUpdate("rentalPrice", e.target.value ? parseFloat(e.target.value) : null)}
                    className="flex-1"
                  />
                  <Select
                    value={rentalPriceUnit}
                    onValueChange={(value) => onUpdate("rentalPriceUnit", value)}
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

            {(listingType === "FOR_SALE" || listingType === "BOTH") && (
              <div className="space-y-2">
                <Label>Sale Price</Label>
                <Input
                  type="number"
                  value={salePrice || ""}
                  onChange={(e) => onUpdate("salePrice", e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
