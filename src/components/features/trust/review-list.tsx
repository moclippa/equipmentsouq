/**
 * Review List Component
 *
 * Displays a paginated list of reviews with rating distribution breakdown.
 * Used on equipment detail pages and owner profile pages.
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ReviewCard, ReviewCardSkeleton } from "./review-card";
import { StarRatingDisplay } from "./star-rating";
import { ChevronDown, MessageSquareOff } from "lucide-react";
import { RATING_VALUES, RATING_LABELS } from "@/types/trust";
import type { ReviewRating, ReviewStatus } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewData {
  id: string;
  rating: ReviewRating;
  title: string | null;
  comment: string | null;
  submittedAt: string | Date | null;
  reviewer: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  equipment?: {
    id: string;
    titleEn: string;
    titleAr: string | null;
  };
  ownerResponse: string | null;
  respondedAt: string | Date | null;
  isVerified: boolean;
  status: ReviewStatus;
  responseTimeHours: number | null;
  didOwnerRespond: boolean;
}

interface RatingDistribution {
  rating: ReviewRating;
  count: number;
}

interface ReviewListProps {
  /** Reviews to display */
  reviews: ReviewData[];
  /** Total review count (for pagination) */
  totalCount: number;
  /** Average rating */
  averageRating: number | null;
  /** Rating distribution */
  ratingDistribution: RatingDistribution[];
  /** Is loading more reviews */
  isLoading?: boolean;
  /** Has more reviews to load */
  hasMore?: boolean;
  /** Load more callback */
  onLoadMore?: () => void;
  /** Flag review callback */
  onFlagReview?: (reviewId: string) => void;
  /** Show equipment references */
  showEquipment?: boolean;
  /** Current language */
  lang?: "en" | "ar";
}

// =============================================================================
// RATING BREAKDOWN
// =============================================================================

const RatingBreakdown = memo(function RatingBreakdown({
  distribution,
  total,
  lang = "en",
}: {
  distribution: RatingDistribution[];
  total: number;
  lang?: "en" | "ar";
}) {
  // Order from best to worst
  const orderedRatings: ReviewRating[] = ["EXCELLENT", "GOOD", "FAIR", "POOR", "VERY_POOR"];

  return (
    <div className="space-y-2">
      {orderedRatings.map((rating) => {
        const item = distribution.find((d) => d.rating === rating);
        const count = item?.count ?? 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const label = RATING_LABELS[rating];
        const stars = RATING_VALUES[rating];

        return (
          <div key={rating} className="flex items-center gap-2 text-sm">
            <span className="w-16 text-muted-foreground shrink-0">
              {stars} {lang === "ar" ? "نجوم" : "stars"}
            </span>
            <Progress value={percentage} className="h-2 flex-1" />
            <span className="w-8 text-end text-muted-foreground">{count}</span>
          </div>
        );
      })}
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ReviewList = memo(function ReviewList({
  reviews,
  totalCount,
  averageRating,
  ratingDistribution,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onFlagReview,
  showEquipment = false,
  lang = "en",
}: ReviewListProps) {
  const [expandedBreakdown, setExpandedBreakdown] = useState(false);

  const handleFlag = useCallback(
    (reviewId: string) => {
      if (onFlagReview) {
        onFlagReview(reviewId);
      }
    },
    [onFlagReview]
  );

  // Empty state
  if (totalCount === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquareOff className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {lang === "ar" ? "لا توجد تقييمات بعد" : "No reviews yet"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {lang === "ar"
              ? "كن أول من يقيم هذا المالك بعد التواصل معه"
              : "Be the first to review this owner after contacting them"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" id="reviews">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {lang === "ar" ? "التقييمات" : "Reviews"}{" "}
              <span className="text-muted-foreground font-normal">
                ({totalCount})
              </span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Average Rating */}
            <div className="text-center sm:text-start">
              <div className="text-4xl font-bold">
                {averageRating?.toFixed(1) ?? "—"}
              </div>
              <StarRatingDisplay rating={averageRating} size="md" className="justify-center sm:justify-start mt-1" />
              <p className="text-sm text-muted-foreground mt-1">
                {lang === "ar"
                  ? `من ${totalCount} تقييم`
                  : `from ${totalCount} reviews`}
              </p>
            </div>

            {/* Rating Breakdown (expandable on mobile) */}
            <div className="flex-1">
              <div className="hidden sm:block">
                <RatingBreakdown
                  distribution={ratingDistribution}
                  total={totalCount}
                  lang={lang}
                />
              </div>
              <div className="sm:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedBreakdown(!expandedBreakdown)}
                  className="w-full justify-between"
                >
                  {lang === "ar" ? "توزيع التقييمات" : "Rating breakdown"}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      expandedBreakdown ? "rotate-180" : ""
                    }`}
                  />
                </Button>
                {expandedBreakdown && (
                  <div className="mt-3">
                    <RatingBreakdown
                      distribution={ratingDistribution}
                      total={totalCount}
                      lang={lang}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Cards */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            showEquipment={showEquipment}
            lang={lang}
            onFlag={onFlagReview ? handleFlag : undefined}
          />
        ))}

        {/* Loading skeletons */}
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <ReviewCardSkeleton key={`skeleton-${i}`} />
          ))}
      </div>

      {/* Load More */}
      {hasMore && !isLoading && onLoadMore && (
        <div className="text-center pt-2">
          <Button variant="outline" onClick={onLoadMore}>
            {lang === "ar" ? "تحميل المزيد" : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// SKELETON LOADER
// =============================================================================

export function ReviewListSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <div className="space-y-2">
              <div className="h-10 w-16 bg-muted animate-pulse rounded" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex-1 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-2 flex-1 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ReviewCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
