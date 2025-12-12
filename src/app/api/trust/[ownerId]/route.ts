/**
 * Owner Trust Metrics API Routes
 *
 * GET /api/trust/[ownerId] - Get trust metrics for a specific owner
 *
 * Public endpoint - trust metrics are visible to all users
 * to help them make informed decisions about equipment owners.
 */

import { NextRequest } from 'next/server';
import { successResponse, notFoundResponse, serviceResultToResponse } from '@/lib/api-response';
import { trustScoringService } from '@/services/trust';
import { BADGE_DEFINITIONS, RATING_LABELS } from '@/types/trust';

// =============================================================================
// GET /api/trust/[ownerId]
// Get trust metrics for a specific owner
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ownerId: string }> }
) {
  const { ownerId } = await params;
  const result = await trustScoringService.getMetrics(ownerId);

  if (!result.success) {
    return serviceResultToResponse(result);
  }

  if (!result.data) {
    return notFoundResponse('Trust metrics');
  }

  // Enrich badges with display information
  const enrichedBadges = result.data.badges.map((badgeId) => {
    const badge = BADGE_DEFINITIONS[badgeId];
    return {
      badgeId,
      labelEn: badge.labelEn,
      labelAr: badge.labelAr,
      descriptionEn: badge.descriptionEn,
      descriptionAr: badge.descriptionAr,
      icon: badge.icon,
      color: badge.color,
    };
  });

  // Enrich rating distribution with labels
  const enrichedRatingDistribution = Object.entries(result.data.reviewMetrics.ratingDistribution).map(
    ([rating, count]) => ({
      rating,
      count,
      label: RATING_LABELS[rating as keyof typeof RATING_LABELS],
    })
  );

  return successResponse({
    ownerId: result.data.ownerId,
    trustScore: result.data.trustScore,
    badges: enrichedBadges,
    responseMetrics: {
      totalLeads: result.data.responseMetrics.totalLeads,
      respondedLeads: result.data.responseMetrics.respondedLeads,
      responseRate: Math.round(result.data.responseMetrics.responseRate),
      avgResponseTimeHours: result.data.responseMetrics.avgResponseTimeHours
        ? Math.round(result.data.responseMetrics.avgResponseTimeHours * 10) / 10
        : null,
    },
    reviewMetrics: {
      totalReviews: result.data.reviewMetrics.totalReviews,
      averageRating: result.data.reviewMetrics.averageRating
        ? Math.round(result.data.reviewMetrics.averageRating * 10) / 10
        : null,
      ratingDistribution: enrichedRatingDistribution,
    },
    listingMetrics: {
      totalListings: result.data.listingMetrics.totalListings,
      activeListings: result.data.listingMetrics.activeListings,
      avgListingQuality: result.data.listingMetrics.avgListingQuality
        ? Math.round(result.data.listingMetrics.avgListingQuality)
        : null,
    },
    memberSince: result.data.memberSince,
    isVerified: result.data.isVerified,
    lastCalculatedAt: result.data.lastCalculatedAt,
  });
}
