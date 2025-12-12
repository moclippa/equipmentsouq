/**
 * Shared Equipment Types
 *
 * Central type definitions for equipment-related data structures.
 * Used across components, services, and API routes.
 */

export interface EquipmentImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface EquipmentOwner {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  businessProfile: {
    companyNameEn: string | null;
    companyNameAr: string | null;
    crVerificationStatus: string;
  } | null;
}

export interface EquipmentCategory {
  id: string;
  nameEn: string;
  nameAr: string | null;
  slug: string;
  parentId: string | null;
}

export type ListingType = "FOR_RENT" | "FOR_SALE" | "BOTH";
export type EquipmentStatus = "DRAFT" | "ACTIVE" | "RENTED" | "SOLD" | "PAUSED" | "ARCHIVED";
export type EquipmentCondition = "EXCELLENT" | "GOOD" | "FAIR" | "POOR";

export interface Equipment {
  id: string;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string;
  descriptionAr: string | null;
  make: string;
  model: string;
  year: number | null;
  condition: EquipmentCondition;
  hoursUsed: number | null;
  specifications: Record<string, unknown> | null;
  listingType: ListingType;
  status: EquipmentStatus;
  rentalPrice: string | null;
  rentalPriceUnit: string | null;
  salePrice: string | null;
  priceOnRequest: boolean;
  currency: string;
  locationCity: string;
  locationRegion: string;
  locationCountry: string;
  contactPhone: string;
  contactWhatsApp: string | null;
  viewCount: number;
  category: EquipmentCategory;
  owner: EquipmentOwner;
  images: EquipmentImage[];
  _count: {
    leads: number;
  };
}

// Display helpers
export const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  EXCELLENT: { label: "Excellent", color: "bg-green-500" },
  GOOD: { label: "Good", color: "bg-blue-500" },
  FAIR: { label: "Fair", color: "bg-yellow-500" },
  POOR: { label: "Poor", color: "bg-red-500" },
};

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  FOR_RENT: "For Rent",
  FOR_SALE: "For Sale",
  BOTH: "For Rent or Sale",
};

// Utility functions
export function formatPrice(amount: string | null, currency: string): string | null {
  if (!amount) return null;
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(parseFloat(amount));
}

export function getWhatsAppLink(phone: string, title: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const message = encodeURIComponent(
    `Hi, I'm interested in your ${title} listing on EquipmentSouq.`
  );
  return `https://wa.me/${cleanPhone}?text=${message}`;
}
