import { UserRole, Country, BusinessProfile } from "@prisma/client";

export interface UserEquipment {
  id: string;
  titleEn: string;
  make: string | null;
  model: string | null;
  year: number | null;
  status: string;
  createdAt: Date;
  category: { nameEn: string };
  _count: { leads: number };
}

export interface UserDetail {
  id: string;
  fullName: string;
  fullNameAr: string | null;
  email: string | null;
  emailVerified: Date | null;
  phone: string | null;
  phoneVerified: boolean | null;
  role: UserRole;
  country: Country;
  isActive: boolean;
  isSuspended: boolean;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  preferredLanguage: string;
  preferredCurrency: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  businessProfile: BusinessProfile | null;
  equipment: UserEquipment[];
  _count: {
    equipment: number;
    notifications: number;
  };
}
