/**
 * Trust System Types
 *
 * Shared type definitions for trust & credibility features including:
 * - Owner reviews
 * - Trust metrics
 * - Listing quality scores
 * - Trust badges
 */

import type { TrustBadge, ReviewRating, ReviewStatus } from '@prisma/client';

// =============================================================================
// RATING UTILITIES
// =============================================================================

/**
 * Map ReviewRating enum to numeric value (1-5)
 */
export const RATING_VALUES: Record<ReviewRating, number> = {
  EXCELLENT: 5,
  GOOD: 4,
  FAIR: 3,
  POOR: 2,
  VERY_POOR: 1,
};

/**
 * Map numeric value to ReviewRating enum
 */
export const VALUE_TO_RATING: Record<number, ReviewRating> = {
  5: 'EXCELLENT',
  4: 'GOOD',
  3: 'FAIR',
  2: 'POOR',
  1: 'VERY_POOR',
};

/**
 * Rating labels for display
 */
export const RATING_LABELS: Record<ReviewRating, { en: string; ar: string }> = {
  EXCELLENT: { en: 'Excellent', ar: 'ممتاز' },
  GOOD: { en: 'Good', ar: 'جيد' },
  FAIR: { en: 'Fair', ar: 'متوسط' },
  POOR: { en: 'Poor', ar: 'ضعيف' },
  VERY_POOR: { en: 'Very Poor', ar: 'سيء جداً' },
};

// =============================================================================
// TRUST BADGE DEFINITIONS
// =============================================================================

export interface BadgeDefinition {
  id: TrustBadge;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
}

export const BADGE_DEFINITIONS: Record<TrustBadge, BadgeDefinition> = {
  VERIFIED_BUSINESS: {
    id: 'VERIFIED_BUSINESS',
    labelEn: 'Verified Business',
    labelAr: 'نشاط تجاري موثق',
    descriptionEn: 'CR or VAT documents verified by EquipmentSouq',
    descriptionAr: 'تم التحقق من مستندات السجل التجاري أو ضريبة القيمة المضافة',
    icon: 'ShieldCheck',
    color: 'blue',
  },
  VERIFIED_IDENTITY: {
    id: 'VERIFIED_IDENTITY',
    labelEn: 'Verified Identity',
    labelAr: 'هوية موثقة',
    descriptionEn: 'Phone and email verified',
    descriptionAr: 'تم التحقق من الهاتف والبريد الإلكتروني',
    icon: 'Verified',
    color: 'green',
  },
  FAST_RESPONDER: {
    id: 'FAST_RESPONDER',
    labelEn: 'Fast Responder',
    labelAr: 'استجابة سريعة',
    descriptionEn: 'Responds to inquiries within 2 hours on average',
    descriptionAr: 'يستجيب للاستفسارات خلال ساعتين في المتوسط',
    icon: 'Clock',
    color: 'purple',
  },
  RELIABLE: {
    id: 'RELIABLE',
    labelEn: 'Reliable',
    labelAr: 'موثوق',
    descriptionEn: 'Responds to 95%+ of inquiries',
    descriptionAr: 'يستجيب لأكثر من 95% من الاستفسارات',
    icon: 'ShieldCheck',
    color: 'amber',
  },
  TOP_RATED: {
    id: 'TOP_RATED',
    labelEn: 'Top Rated',
    labelAr: 'الأعلى تقييماً',
    descriptionEn: '4.5+ star rating with 10+ reviews',
    descriptionAr: 'تقييم 4.5+ نجمة مع أكثر من 10 تقييمات',
    icon: 'Star',
    color: 'yellow',
  },
  FEATURED_SELLER: {
    id: 'FEATURED_SELLER',
    labelEn: 'Featured Seller',
    labelAr: 'بائع مميز',
    descriptionEn: 'Premium seller with priority placement',
    descriptionAr: 'بائع مميز مع أولوية في الظهور',
    icon: 'Star',
    color: 'rose',
  },
};

// =============================================================================
// TRUST METRICS
// =============================================================================

export interface TrustMetrics {
  ownerId: string;
  trustScore: number;
  badges: TrustBadge[];
  responseMetrics: {
    totalLeads: number;
    respondedLeads: number;
    responseRate: number;
    avgResponseTimeHours: number | null;
  };
  reviewMetrics: {
    totalReviews: number;
    averageRating: number | null;
    ratingDistribution: Record<ReviewRating, number>;
  };
  listingMetrics: {
    totalListings: number;
    activeListings: number;
    avgListingQuality: number | null;
  };
  memberSince: Date;
  isVerified: boolean;
  lastCalculatedAt: Date;
}

// =============================================================================
// REVIEW TYPES
// =============================================================================

export interface ReviewOwner {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface ReviewEquipment {
  id: string;
  titleEn: string;
  titleAr: string | null;
}

export interface ReviewWithRelations {
  id: string;
  rating: ReviewRating;
  title: string | null;
  comment: string | null;
  submittedAt: Date | null;
  owner: ReviewOwner;
  reviewer: ReviewOwner;
  equipment: ReviewEquipment;
  ownerResponse: string | null;
  respondedAt: Date | null;
  isVerified: boolean;
  status: ReviewStatus;
  responseTimeHours: number | null;
  didOwnerRespond: boolean;
}

export interface CreateReviewInput {
  leadId: string;
  rating: ReviewRating;
  title?: string;
  comment?: string;
}

export interface OwnerRespondInput {
  reviewId: string;
  response: string;
}

// =============================================================================
// LISTING QUALITY
// =============================================================================

export interface ListingQuality {
  equipmentId: string;
  photoScore: number;
  descriptionScore: number;
  specificationScore: number;
  overallScore: number;
}

// =============================================================================
// SCORING THRESHOLDS
// =============================================================================

export const TRUST_THRESHOLDS = {
  // Badge thresholds
  FAST_RESPONDER_MAX_HOURS: 2,
  RELIABLE_MIN_RATE: 95,
  TOP_RATED_MIN_RATING: 4.5,
  TOP_RATED_MIN_REVIEWS: 10,

  // Score weights
  WEIGHT_RESPONSE: 0.4,
  WEIGHT_REVIEWS: 0.3,
  WEIGHT_LISTING_QUALITY: 0.2,
  WEIGHT_VERIFICATION: 0.1,

  // Review eligibility
  REVIEW_DELAY_DAYS: 7,
  REVIEW_EXPIRY_DAYS: 30,
} as const;

// =============================================================================
// PHOTO SCORING
// =============================================================================

export const PHOTO_SCORE_TABLE: Record<number, number> = {
  0: 0,
  1: 20,
  2: 40,
  3: 60,
  4: 80,
  5: 100,
};

/**
 * Get photo score based on image count
 */
export function getPhotoScore(imageCount: number): number {
  if (imageCount >= 5) return 100;
  return PHOTO_SCORE_TABLE[imageCount] ?? 0;
}
