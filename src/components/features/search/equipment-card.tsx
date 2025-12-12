"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvailabilityStatusBadge } from "./availability-status-badge";
import { MapPin } from "lucide-react";

export interface EquipmentCardData {
  id: string;
  titleEn: string;
  titleAr: string | null;
  make: string;
  model: string;
  year: number | null;
  condition: string;
  status: "ACTIVE" | "RENTED" | "SOLD" | "PAUSED" | "DRAFT" | "ARCHIVED";
  listingType: "FOR_RENT" | "FOR_SALE" | "BOTH";
  rentalPrice: string | null;
  rentalPriceUnit: string | null;
  salePrice: string | null;
  priceOnRequest: boolean;
  currency: string;
  locationCity: string;
  locationRegion: string;
  locationCountry: string;
  hasAvailabilityConflict?: boolean;
  category: {
    id: string;
    nameEn: string;
    nameAr: string | null;
    slug: string;
  };
  owner: {
    id: string;
    fullName: string | null;
  };
  images: Array<{
    url: string;
    isPrimary: boolean;
  }>;
  _count: {
    leads: number;
  };
}

interface EquipmentCardProps {
  equipment: EquipmentCardData;
  formatPrice: (amount: string, currency: string) => string;
}

// Grid view card - memoized for performance
export const EquipmentGridCard = memo(function EquipmentGridCard({
  equipment,
  formatPrice,
}: EquipmentCardProps) {
  const primaryImage = equipment.images.find(img => img.isPrimary) || equipment.images[0];

  return (
    <Link href={`/equipment/${equipment.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow group h-full">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-muted">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={equipment.titleEn}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No image
            </div>
          )}

          {/* Listing Type Badges */}
          <div className="absolute top-2 start-2 flex flex-col gap-1">
            {equipment.listingType === "FOR_SALE" && (
              <Badge className="bg-green-600 text-white">
                For Sale
              </Badge>
            )}
            {equipment.listingType === "BOTH" && (
              <Badge variant="secondary">
                Rent or Buy
              </Badge>
            )}
          </div>

          {/* Status Badge - show for rented/sold items or date conflicts */}
          {(equipment.status !== "ACTIVE" || equipment.hasAvailabilityConflict) && (
            <div className="absolute top-2 end-2">
              <AvailabilityStatusBadge
                status={equipment.status}
                hasAvailabilityConflict={equipment.hasAvailabilityConflict}
              />
            </div>
          )}

          {/* Price Badge */}
          <div className="absolute bottom-2 end-2">
            {equipment.priceOnRequest ? (
              <Badge variant="secondary" className="text-sm font-medium px-2 py-1">
                Contact for price
              </Badge>
            ) : equipment.rentalPrice ? (
              <Badge variant="secondary" className="text-base font-bold px-2 py-1">
                {formatPrice(equipment.rentalPrice, equipment.currency)}/{equipment.rentalPriceUnit || "day"}
              </Badge>
            ) : equipment.salePrice ? (
              <Badge variant="secondary" className="text-base font-bold px-2 py-1">
                {formatPrice(equipment.salePrice, equipment.currency)}
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">
            {equipment.category.nameEn}
          </div>
          <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
            {equipment.titleEn}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {equipment.make} {equipment.model} {equipment.year && `(${equipment.year})`}
          </p>

          <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
            <span className="flex items-center">
              <MapPin className="w-3 h-3 me-1" />
              {equipment.locationCity}
            </span>
            <span className="text-xs">
              {equipment.condition}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

// List view card - memoized for performance
export const EquipmentListCard = memo(function EquipmentListCard({
  equipment,
  formatPrice,
}: EquipmentCardProps) {
  const primaryImage = equipment.images.find(img => img.isPrimary) || equipment.images[0];

  return (
    <Link href={`/equipment/${equipment.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
        <div className="flex">
          {/* Image */}
          <div className="relative w-48 sm:w-56 shrink-0 bg-muted">
            {primaryImage ? (
              <Image
                src={primaryImage.url}
                alt={equipment.titleEn}
                fill
                sizes="224px"
                className="object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full min-h-[120px] flex items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
            {/* Listing Type Badge */}
            <div className="absolute top-2 start-2">
              {equipment.listingType === "FOR_SALE" && (
                <Badge className="bg-green-600 text-white">
                  For Sale
                </Badge>
              )}
              {equipment.listingType === "BOTH" && (
                <Badge variant="secondary">
                  Rent or Buy
                </Badge>
              )}
            </div>

            {/* Status Badge - show for rented/sold items or date conflicts */}
            {(equipment.status !== "ACTIVE" || equipment.hasAvailabilityConflict) && (
              <div className="absolute top-2 end-2">
                <AvailabilityStatusBadge
                  status={equipment.status}
                  hasAvailabilityConflict={equipment.hasAvailabilityConflict}
                />
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">
                    {equipment.category.nameEn}
                  </div>
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                    {equipment.titleEn}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {equipment.make} {equipment.model} {equipment.year && `(${equipment.year})`}
                  </p>
                </div>
                {/* Price */}
                <div className="shrink-0 text-end">
                  {equipment.priceOnRequest ? (
                    <span className="text-sm font-medium text-muted-foreground">
                      Contact for price
                    </span>
                  ) : equipment.rentalPrice ? (
                    <div>
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(equipment.rentalPrice, equipment.currency)}
                      </span>
                      <span className="text-sm text-muted-foreground">/{equipment.rentalPriceUnit || "day"}</span>
                    </div>
                  ) : equipment.salePrice ? (
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(equipment.salePrice, equipment.currency)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Footer info */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-muted-foreground">
              <span className="flex items-center">
                <MapPin className="w-3 h-3 me-1" />
                {equipment.locationCity}, {equipment.locationCountry}
              </span>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  {equipment.condition}
                </Badge>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
});
