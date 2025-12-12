"use client";

import { ListingStatus, ListingType, Country } from "@prisma/client";

export interface SearchParams {
  status?: string;
  type?: string;
  country?: string;
  q?: string;
  ownerId?: string;
  page?: string;
}

export interface EquipmentOwner {
  id: string;
  fullName: string | null;
  phone: string | null;
}

export interface EquipmentCategory {
  nameEn: string;
}

export interface EquipmentImage {
  url: string;
}

export interface EquipmentItem {
  id: string;
  titleEn: string;
  make: string | null;
  model: string | null;
  year: number | null;
  status: ListingStatus;
  listingType: ListingType;
  rentalPrice: unknown;
  rentalPriceUnit: string | null;
  salePrice: unknown;
  priceOnRequest: boolean;
  currency: string;
  locationCity: string | null;
  locationCountry: Country;
  createdAt: Date;
  owner: EquipmentOwner;
  category: EquipmentCategory;
  images: EquipmentImage[];
  _count: {
    leads: number;
  };
}

export interface EquipmentListData {
  equipment: EquipmentItem[];
  total: number;
  page: number;
  totalPages: number;
}
