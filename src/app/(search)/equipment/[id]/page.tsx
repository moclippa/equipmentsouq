"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AvailabilityStatusBadge } from "@/components/features/search/availability-status-badge";
import { EquipmentImageGallery } from "@/components/features/equipment/equipment-image-gallery";
import { EquipmentQuickStats } from "@/components/features/equipment/equipment-quick-stats";
import { OwnerManagementCard } from "@/components/features/equipment/owner-management-card";
import { EquipmentPricingCard } from "@/components/features/equipment/equipment-pricing-card";
import { OwnerTrustCard, ReviewList, ReviewListSkeleton } from "@/components/features/trust";
import { ChevronLeft, MapPin, Loader2, AlertCircle } from "lucide-react";
import { Equipment, CONDITION_LABELS, EquipmentCondition } from "@/types/equipment";
import type { TrustBadge, ReviewRating, ReviewStatus } from "@prisma/client";

export default function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trust metrics state
  const [trustMetrics, setTrustMetrics] = useState<{
    trustScore: number;
    badges: TrustBadge[];
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
  } | null>(null);

  // Reviews state
  interface ReviewData {
    id: string;
    rating: ReviewRating;
    title: string | null;
    comment: string | null;
    submittedAt: string | null;
    reviewer: {
      id: string;
      fullName: string | null;
      avatarUrl: string | null;
    };
    ownerResponse: string | null;
    respondedAt: string | null;
    isVerified: boolean;
    status: ReviewStatus;
    responseTimeHours: number | null;
    didOwnerRespond: boolean;
  }

  interface RatingDistribution {
    rating: ReviewRating;
    count: number;
  }

  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [ratingDistribution, setRatingDistribution] = useState<RatingDistribution[]>([]);

  // Check if current user is the owner
  const isOwner =
    session?.user?.id && equipment?.owner?.id && session.user.id === equipment.owner.id;

  // Fetch equipment data
  useEffect(() => {
    async function fetchEquipment() {
      try {
        const res = await fetch(`/api/equipment/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load equipment");
          return;
        }

        setEquipment(data.equipment);

        // Fetch trust metrics for the owner
        if (data.equipment?.owner?.id) {
          fetchTrustMetrics(data.equipment.owner.id);
          fetchReviews(data.equipment.owner.id, 1);
        }
      } catch (err) {
        console.error("Failed to fetch equipment:", err);
        setError("Failed to load equipment");
      } finally {
        setIsLoading(false);
      }
    }

    fetchEquipment();
  }, [id]);

  // Fetch trust metrics
  const fetchTrustMetrics = async (ownerId: string) => {
    try {
      const res = await fetch(`/api/trust/${ownerId}`);
      if (res.ok) {
        const data = await res.json();
        setTrustMetrics(data.data);
        // Parse rating distribution from enriched format
        if (data.data?.reviewMetrics?.ratingDistribution) {
          setRatingDistribution(data.data.reviewMetrics.ratingDistribution);
        }
      }
    } catch (err) {
      console.error("Failed to fetch trust metrics:", err);
    }
  };

  // Fetch reviews
  const fetchReviews = useCallback(async (ownerId: string, page: number) => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/reviews?ownerId=${ownerId}&page=${page}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setReviews(data.data.reviews);
        } else {
          setReviews((prev) => [...prev, ...data.data.reviews]);
        }
        setHasMoreReviews(data.data.pagination.page < data.data.pagination.totalPages);
        setReviewsPage(page);
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  const handleLoadMoreReviews = useCallback(() => {
    if (equipment?.owner?.id) {
      fetchReviews(equipment.owner.id, reviewsPage + 1);
    }
  }, [equipment?.owner?.id, reviewsPage, fetchReviews]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-xl font-semibold mb-2">Equipment Not Found</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push("/search")}>
          <ChevronLeft className="w-4 h-4 me-1" />
          Back to Search
        </Button>
      </div>
    );
  }

  const conditionInfo = CONDITION_LABELS[equipment.condition] || {
    label: equipment.condition,
    color: "bg-gray-500",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ChevronLeft className="w-4 h-4 me-1" />
              Back
            </Button>
            <nav className="text-sm text-muted-foreground hidden sm:block">
              <Link href="/search" className="hover:text-foreground">
                Search
              </Link>
              <span className="mx-2">/</span>
              <Link
                href={`/search?category=${equipment.category.slug}`}
                className="hover:text-foreground"
              >
                {equipment.category.nameEn}
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Status Banner for Unavailable Items */}
        {equipment.status !== "ACTIVE" && (
          <div className="mb-6 p-4 rounded-lg border bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <AvailabilityStatusBadge status={equipment.status} size="md" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  {equipment.status === "RENTED"
                    ? "This equipment is currently rented"
                    : equipment.status === "SOLD"
                      ? "This equipment has been sold"
                      : "This equipment is not currently available"}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {equipment.status === "RENTED"
                    ? "Contact the owner to check future availability or similar equipment."
                    : equipment.status === "SOLD"
                      ? "Browse similar equipment or contact the owner for other listings."
                      : "This listing may be temporarily unavailable."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Images & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <EquipmentImageGallery
              images={equipment.images}
              title={equipment.titleEn}
              listingType={equipment.listingType}
              viewCount={equipment.viewCount}
              equipmentId={equipment.id}
              isOwner={!!isOwner}
            />

            {/* Equipment Details */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {equipment.category.nameEn}
                    </Badge>
                    <CardTitle className="text-2xl">{equipment.titleEn}</CardTitle>
                    <p className="text-muted-foreground mt-1">
                      {equipment.make} {equipment.model}{" "}
                      {equipment.year && `(${equipment.year})`}
                    </p>
                  </div>
                  <Badge className={`${conditionInfo.color} text-white`}>
                    {conditionInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Stats */}
                <EquipmentQuickStats
                  year={equipment.year}
                  hoursUsed={equipment.hoursUsed}
                  locationCity={equipment.locationCity}
                  condition={equipment.condition as EquipmentCondition}
                />

                <Separator />

                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {equipment.descriptionEn}
                  </p>
                </div>

                {/* Specifications */}
                {equipment.specifications &&
                  Object.keys(equipment.specifications).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-3">Specifications</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {Object.entries(equipment.specifications).map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="text-muted-foreground capitalize">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </span>
                              <p className="font-medium">
                                {typeof value === "boolean"
                                  ? value
                                    ? "Yes"
                                    : "No"
                                  : String(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Pricing & Contact */}
          <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            {/* Owner Management Card */}
            {isOwner && (
              <OwnerManagementCard
                equipmentId={equipment.id}
                viewCount={equipment.viewCount}
                leadCount={equipment._count.leads}
              />
            )}

            {/* Pricing Card */}
            <EquipmentPricingCard
              equipmentId={equipment.id}
              title={equipment.titleEn}
              listingType={equipment.listingType}
              status={equipment.status}
              priceOnRequest={equipment.priceOnRequest}
              rentalPrice={equipment.rentalPrice}
              rentalPriceUnit={equipment.rentalPriceUnit}
              salePrice={equipment.salePrice}
              currency={equipment.currency}
              contactPhone={equipment.contactPhone}
              contactWhatsApp={equipment.contactWhatsApp}
              categoryId={equipment.category.id}
              isOwner={!!isOwner}
            />

            {/* Owner Trust Card - only show to non-owners */}
            {!isOwner && (
              <OwnerTrustCard
                owner={{
                  id: equipment.owner.id,
                  fullName: equipment.owner.fullName,
                  avatarUrl: equipment.owner.avatarUrl,
                  memberSince: equipment.owner.createdAt,
                  businessProfile: equipment.owner.businessProfile,
                  trustMetrics: trustMetrics,
                }}
                equipmentId={equipment.id}
              />
            )}

            {/* Location Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {equipment.locationCity}, {equipment.locationRegion}
                  <br />
                  {equipment.locationCountry === "SA" ? "Saudi Arabia" : "Bahrain"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reviews Section */}
        {!isOwner && (
          <div className="mt-8">
            {reviewsLoading && reviews.length === 0 ? (
              <ReviewListSkeleton />
            ) : (
              <ReviewList
                reviews={reviews}
                totalCount={trustMetrics?.reviewMetrics.totalReviews ?? 0}
                averageRating={trustMetrics?.reviewMetrics.averageRating ?? null}
                ratingDistribution={ratingDistribution}
                isLoading={reviewsLoading}
                hasMore={hasMoreReviews}
                onLoadMore={handleLoadMoreReviews}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
