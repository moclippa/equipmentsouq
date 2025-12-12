export interface EquipmentImage {
  id?: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
  file?: File;
  isNew?: boolean;
}

export interface EquipmentEditData {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  make: string;
  model: string;
  year: number | null;
  condition: string;
  hoursUsed: number | null;
  listingType: "FOR_RENT" | "FOR_SALE" | "BOTH";
  rentalPrice: number | null;
  rentalPriceUnit: string;
  salePrice: number | null;
  priceOnRequest: boolean;
  currency: string;
  locationCity: string;
  locationRegion: string;
  locationCountry: string;
  contactPhone: string;
  contactWhatsApp: string | null;
  status: string;
  images: EquipmentImage[];
  category: { id: string; nameEn: string };
}

export const CONDITIONS = [
  { value: "EXCELLENT", label: "Excellent" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
] as const;

export const SA_CITIES = [
  "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Dhahran",
  "Jubail", "Yanbu", "Tabuk", "Abha", "Khamis Mushait", "Taif", "Hail",
  "Najran", "Jizan", "Al Ahsa", "Qatif", "Hofuf", "Buraidah"
] as const;

export const BH_CITIES = [
  "Manama", "Riffa", "Muharraq", "Hamad Town", "Isa Town", "Sitra",
  "Budaiya", "Jidhafs", "Al Hidd"
] as const;

export const SA_REGIONS = ["Central", "Western", "Eastern", "Northern", "Southern"] as const;
export const BH_REGIONS = ["Capital", "Northern", "Southern", "Muharraq"] as const;

export function getCitiesForCountry(country: string): readonly string[] {
  return country === "SA" ? SA_CITIES : BH_CITIES;
}

export function getRegionsForCountry(country: string): readonly string[] {
  return country === "SA" ? SA_REGIONS : BH_REGIONS;
}
