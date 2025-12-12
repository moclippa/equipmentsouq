import { LeadStatus } from "@prisma/client";

export interface SearchParams {
  status?: string;
  interest?: string;
  q?: string;
  page?: string;
}

export interface LeadEquipmentOwner {
  id: string;
  fullName: string | null;
  phone: string | null;
}

export interface LeadEquipment {
  id: string;
  titleEn: string;
  make: string | null;
  model: string | null;
  owner: LeadEquipmentOwner;
}

export interface LeadItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  interestedIn: string;
  status: LeadStatus;
  ownerViewedAt: Date | null;
  createdAt: Date;
  equipment: LeadEquipment;
}

export interface StatusCount {
  NEW?: number;
  VIEWED?: number;
  CONTACTED?: number;
  CONVERTED?: number;
  CLOSED?: number;
}

export interface LeadsListData {
  leads: LeadItem[];
  total: number;
  counts: StatusCount;
  page: number;
  totalPages: number;
}
