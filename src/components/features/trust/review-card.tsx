/**
 * Review Card Component
 *
 * Displays a single review with rating, comment, owner response,
 * and verification status. Used in review lists.
 */

"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BadgeCheck, Clock, MessageSquare, Flag } from "lucide-react";
import { StarRatingDisplay } from "./star-rating";
import { RATING_VALUES } from "@/types/trust";
import type { ReviewRating, ReviewStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

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

interface ReviewCardProps {
  review: ReviewData;
  /** Show equipment reference */
  showEquipment?: boolean;
  /** Current language */
  lang?: "en" | "ar";
  /** Callback when flag button clicked */
  onFlag?: (reviewId: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ReviewCard = memo(function ReviewCard({
  review,
  showEquipment = false,
  lang = "en",
  onFlag,
}: ReviewCardProps) {
  const ratingValue = RATING_VALUES[review.rating];
  const dateLocale = lang === "ar" ? ar : enUS;

  const submittedDate = review.submittedAt
    ? formatDistanceToNow(new Date(review.submittedAt), {
        addSuffix: true,
        locale: dateLocale,
      })
    : null;

  const respondedDate = review.respondedAt
    ? formatDistanceToNow(new Date(review.respondedAt), {
        addSuffix: true,
        locale: dateLocale,
      })
    : null;

  // Format response time feedback
  const getResponseTimeFeedback = (): { text: string; positive: boolean } | null => {
    if (!review.didOwnerRespond) {
      return {
        text: lang === "ar" ? "لم يستجب المالك" : "Owner did not respond",
        positive: false,
      };
    }
    if (review.responseTimeHours === null) return null;

    if (review.responseTimeHours <= 2) {
      return {
        text: lang === "ar" ? "استجابة سريعة" : "Quick response",
        positive: true,
      };
    }
    if (review.responseTimeHours <= 24) {
      return {
        text: lang === "ar" ? "استجاب خلال يوم" : "Responded within a day",
        positive: true,
      };
    }
    return {
      text: lang === "ar" ? "استجابة بطيئة" : "Slow response",
      positive: false,
    };
  };

  const responseTimeFeedback = getResponseTimeFeedback();

  return (
    <Card className={review.status === "FLAGGED" ? "border-destructive/50" : ""}>
      <CardContent className="pt-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={review.reviewer.avatarUrl || undefined} />
              <AvatarFallback>
                {review.reviewer.fullName?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {review.reviewer.fullName || (lang === "ar" ? "مستخدم" : "User")}
                </span>
                {review.isVerified && (
                  <Badge variant="secondary" className="text-xs py-0 px-1.5">
                    <BadgeCheck className="w-3 h-3 me-0.5" />
                    {lang === "ar" ? "موثق" : "Verified"}
                  </Badge>
                )}
              </div>
              {submittedDate && (
                <p className="text-xs text-muted-foreground">{submittedDate}</p>
              )}
            </div>
          </div>

          {/* Rating */}
          <StarRatingDisplay rating={ratingValue} size="sm" />
        </div>

        {/* Equipment reference */}
        {showEquipment && review.equipment && (
          <p className="text-xs text-muted-foreground mt-2">
            {lang === "ar" ? "عن:" : "About:"}{" "}
            <span className="font-medium">
              {lang === "ar" && review.equipment.titleAr
                ? review.equipment.titleAr
                : review.equipment.titleEn}
            </span>
          </p>
        )}

        {/* Review content */}
        <div className="mt-3 space-y-2">
          {review.title && (
            <p className="font-medium">{review.title}</p>
          )}
          {review.comment && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {review.comment}
            </p>
          )}
        </div>

        {/* Response time feedback */}
        {responseTimeFeedback && (
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <Clock className="w-3 h-3" />
            <span
              className={
                responseTimeFeedback.positive
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground"
              }
            >
              {responseTimeFeedback.text}
            </span>
          </div>
        )}

        {/* Owner response */}
        {review.ownerResponse && (
          <>
            <Separator className="my-3" />
            <div className="bg-muted/50 rounded-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium">
                  {lang === "ar" ? "رد المالك" : "Owner Response"}
                </span>
                {respondedDate && (
                  <span className="text-xs text-muted-foreground">
                    • {respondedDate}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {review.ownerResponse}
              </p>
            </div>
          </>
        )}

        {/* Flag button (for inappropriate content) */}
        {onFlag && review.status !== "FLAGGED" && (
          <button
            onClick={() => onFlag(review.id)}
            className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <Flag className="w-3 h-3" />
            {lang === "ar" ? "إبلاغ" : "Report"}
          </button>
        )}

        {/* Flagged indicator */}
        {review.status === "FLAGGED" && (
          <Badge variant="destructive" className="mt-3">
            <Flag className="w-3 h-3 me-1" />
            {lang === "ar" ? "قيد المراجعة" : "Under Review"}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
});

// =============================================================================
// REVIEW LIST SKELETON
// =============================================================================

export function ReviewCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
