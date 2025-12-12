/**
 * Owner Trust Card Component
 *
 * Enhanced owner information card displaying trust metrics, badges,
 * response statistics, and review summary. Used on equipment detail pages.
 */

"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  MessageSquare,
  Calendar,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { TrustBadgeStack } from "./trust-badge";
import { RatingSummary } from "./star-rating";
import type { TrustBadge as TrustBadgeType } from "@prisma/client";
import Link from "next/link";

// =============================================================================
// TYPES
// =============================================================================

interface OwnerTrustData {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  memberSince: string | Date;
  businessProfile?: {
    companyNameEn: string | null;
    companyNameAr: string | null;
  } | null;
  trustMetrics?: {
    trustScore: number;
    badges: TrustBadgeType[];
    responseMetrics: {
      responseRate: number;
      avgResponseTimeHours: number | null;
    };
    reviewMetrics: {
      totalReviews: number;
      averageRating: number | null;
    };
    listingMetrics: {
      activeListings: number;
    };
  } | null;
}

interface OwnerTrustCardProps {
  owner: OwnerTrustData;
  /** Equipment ID for review link */
  equipmentId?: string;
  /** Current language */
  lang?: "en" | "ar";
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const StatItem = memo(function StatItem({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="p-1.5 rounded-md bg-muted">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm">{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const OwnerTrustCard = memo(function OwnerTrustCard({
  owner,
  equipmentId,
  lang = "en",
}: OwnerTrustCardProps) {
  const memberSince = new Date(owner.memberSince).toLocaleDateString(
    lang === "ar" ? "ar-SA" : "en-US",
    { month: "short", year: "numeric" }
  );

  const displayName =
    owner.businessProfile?.companyNameEn ||
    owner.fullName ||
    (lang === "ar" ? "مالك المعدات" : "Equipment Owner");

  const metrics = owner.trustMetrics;
  const hasMetrics = metrics && metrics.trustScore > 0;

  // Format response time
  const formatResponseTime = (hours: number | null): string => {
    if (hours === null) return lang === "ar" ? "غير متوفر" : "N/A";
    if (hours < 1) return lang === "ar" ? "أقل من ساعة" : "Under 1 hour";
    if (hours < 24) return lang === "ar" ? `${Math.round(hours)} ساعة` : `${Math.round(hours)} hours`;
    const days = Math.round(hours / 24);
    return lang === "ar" ? `${days} يوم` : `${days} days`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {lang === "ar" ? "مُدرج بواسطة" : "Listed by"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Owner Info */}
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={owner.avatarUrl || undefined} />
            <AvatarFallback>
              {displayName[0]?.toUpperCase() || "O"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{displayName}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {lang === "ar" ? `عضو منذ ${memberSince}` : `Member since ${memberSince}`}
            </p>
          </div>
        </div>

        {/* Trust Badges */}
        {metrics && metrics.badges.length > 0 && (
          <TrustBadgeStack
            badges={metrics.badges}
            maxVisible={4}
            showLabels={false}
            lang={lang}
          />
        )}

        {/* Trust Score */}
        {hasMetrics && (
          <>
            <Separator />
            <div className="space-y-3">
              {/* Trust Score Bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {lang === "ar" ? "نقاط الثقة" : "Trust Score"}
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {metrics.trustScore}/100
                  </span>
                </div>
                <Progress value={metrics.trustScore} className="h-2" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatItem
                  icon={MessageSquare}
                  label={lang === "ar" ? "معدل الاستجابة" : "Response Rate"}
                  value={`${Math.round(metrics.responseMetrics.responseRate)}%`}
                />
                <StatItem
                  icon={Clock}
                  label={lang === "ar" ? "متوسط الاستجابة" : "Avg. Response"}
                  value={formatResponseTime(metrics.responseMetrics.avgResponseTimeHours)}
                />
              </div>

              {/* Rating Summary */}
              {metrics.reviewMetrics.totalReviews > 0 && (
                <div className="pt-2">
                  <RatingSummary
                    rating={metrics.reviewMetrics.averageRating}
                    count={metrics.reviewMetrics.totalReviews}
                    size="sm"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* View Reviews Link */}
        {metrics && metrics.reviewMetrics.totalReviews > 0 && equipmentId && (
          <Link
            href={`/equipment/${equipmentId}#reviews`}
            className="flex items-center justify-between text-sm text-primary hover:underline pt-2"
          >
            <span>
              {lang === "ar"
                ? `عرض جميع التقييمات (${metrics.reviewMetrics.totalReviews})`
                : `View all reviews (${metrics.reviewMetrics.totalReviews})`}
            </span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}

        {/* No metrics fallback */}
        {!hasMetrics && (
          <Badge variant="outline" className="w-full justify-center py-2">
            {lang === "ar" ? "مالك جديد" : "New Owner"}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
});

// =============================================================================
// COMPACT VERSION (for search cards)
// =============================================================================

interface OwnerTrustCompactProps {
  trustScore?: number | null;
  badges?: TrustBadgeType[];
  responseRate?: number | null;
  reviewCount?: number;
  averageRating?: number | null;
  lang?: "en" | "ar";
}

export const OwnerTrustCompact = memo(function OwnerTrustCompact({
  trustScore,
  badges = [],
  responseRate,
  reviewCount = 0,
  averageRating,
  lang = "en",
}: OwnerTrustCompactProps) {
  if (!trustScore && badges.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {badges.length > 0 && (
        <TrustBadgeStack
          badges={badges}
          maxVisible={2}
          compact
          lang={lang}
        />
      )}
      {reviewCount > 0 && averageRating && (
        <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
          <span className="text-yellow-500">★</span>
          <span>{averageRating.toFixed(1)}</span>
          <span>({reviewCount})</span>
        </div>
      )}
      {responseRate !== null && responseRate !== undefined && responseRate >= 90 && (
        <span className="text-xs text-green-600 dark:text-green-400">
          {Math.round(responseRate)}% {lang === "ar" ? "استجابة" : "response"}
        </span>
      )}
    </div>
  );
});
