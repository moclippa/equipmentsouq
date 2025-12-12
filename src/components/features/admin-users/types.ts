import { UserRole, Country } from "@prisma/client";

export interface SearchParams {
  role?: string;
  country?: string;
  status?: string;
  q?: string;
  page?: string;
}

export interface UserBusinessProfile {
  companyNameEn: string | null;
  businessType: string;
  crVerificationStatus: string;
}

export interface UserItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  country: Country;
  isActive: boolean;
  isSuspended: boolean;
  createdAt: Date;
  businessProfile: UserBusinessProfile | null;
  _count: {
    equipment: number;
  };
}

export interface UsersListData {
  users: UserItem[];
  total: number;
  page: number;
  totalPages: number;
}
