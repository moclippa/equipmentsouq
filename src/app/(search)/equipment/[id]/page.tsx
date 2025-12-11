"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ContactForm } from "@/components/features/leads/contact-form";
import {
  MapPin,
  Calendar,
  Clock,
  Shield,
  ChevronLeft,
  Building2,
  Phone,
  Share2,
  Heart,
  Loader2,
  AlertCircle,
  Eye,
  Tag,
  Check,
  Copy,
} from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";
import { toast } from "sonner";

interface EquipmentImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface Equipment {
  id: string;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string;
  descriptionAr: string | null;
  make: string;
  model: string;
  year: number | null;
  condition: string;
  hoursUsed: number | null;
  specifications: Record<string, unknown> | null;
  listingType: "FOR_RENT" | "FOR_SALE" | "BOTH";
  rentalPrice: string | null;
  rentalPriceUnit: string | null;
  salePrice: string | null;
  priceOnRequest: boolean;
  currency: string;
  locationCity: string;
  locationRegion: string;
  locationCountry: string;
  contactPhone: string;
  contactWhatsApp: string | null;
  viewCount: number;
  category: {
    id: string;
    nameEn: string;
    nameAr: string | null;
    slug: string;
    parentId: string | null;
  };
  owner: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    createdAt: string;
    businessProfile: {
      companyNameEn: string | null;
      companyNameAr: string | null;
      crVerificationStatus: string;
    } | null;
  };
  images: EquipmentImage[];
  _count: {
    leads: number;
  };
}

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  EXCELLENT: { label: "Excellent", color: "bg-green-500" },
  GOOD: { label: "Good", color: "bg-blue-500" },
  FAIR: { label: "Fair", color: "bg-yellow-500" },
  POOR: { label: "Poor", color: "bg-red-500" },
};

const LISTING_TYPE_LABELS = {
  FOR_RENT: "For Rent",
  FOR_SALE: "For Sale",
  BOTH: "For Rent or Sale",
};

export default function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // Check if equipment is in favorites on mount
  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    setIsFavorite(favorites.includes(id));
  }, [id]);

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
      } catch (err) {
        console.error("Failed to fetch equipment:", err);
        setError("Failed to load equipment");
      } finally {
        setIsLoading(false);
      }
    }

    fetchEquipment();
  }, [id]);

  const formatPrice = (amount: string | null, currency: string) => {
    if (!amount) return null;
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const getWhatsAppLink = (phone: string, title: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hi, I'm interested in your ${title} listing on EquipmentSouq.`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  const handleShare = async () => {
    if (!equipment) return;

    const shareData = {
      title: equipment.titleEn,
      text: `Check out this ${equipment.make} ${equipment.model} on EquipmentSouq`,
      url: window.location.href,
    };

    trackEvent("SHARE_CLICK", { equipmentId: equipment.id });

    // Try native share first (works on mobile)
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
        if ((err as Error).name === "AbortError") return;
      }
    }

    // Fall back to clipboard copy
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleFavorite = () => {
    if (!equipment) return;

    const favorites: string[] = JSON.parse(localStorage.getItem("favorites") || "[]");

    if (isFavorite) {
      // Remove from favorites
      const updated = favorites.filter((fid) => fid !== equipment.id);
      localStorage.setItem("favorites", JSON.stringify(updated));
      setIsFavorite(false);
      toast.success("Removed from favorites");
    } else {
      // Add to favorites
      favorites.push(equipment.id);
      localStorage.setItem("favorites", JSON.stringify(favorites));
      setIsFavorite(true);
      toast.success("Added to favorites");
      trackEvent("FAVORITE_CLICK", { equipmentId: equipment.id });
    }
  };

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

  const memberSince = new Date(equipment.owner.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

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
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Images & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card className="overflow-hidden">
              <div className="relative aspect-[16/10] bg-muted">
                {equipment.images.length > 0 ? (
                  <>
                    <Image
                      src={equipment.images[selectedImageIndex]?.url || equipment.images[0].url}
                      alt={equipment.titleEn}
                      fill
                      className="object-contain"
                      priority
                    />

                    {/* Listing Type Badge */}
                    <div className="absolute top-4 start-4 flex flex-col gap-2">
                      <Badge className="bg-primary text-primary-foreground">
                        <Tag className="w-3 h-3 me-1" />
                        {LISTING_TYPE_LABELS[equipment.listingType]}
                      </Badge>
                    </div>

                    {/* Share & Favorite */}
                    <div className="absolute top-4 end-4 flex gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={handleShare}
                        title="Share listing"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={handleFavorite}
                        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        className={isFavorite ? "text-red-500 hover:text-red-600" : ""}
                      >
                        <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
                      </Button>
                    </div>

                    {/* View count */}
                    <div className="absolute bottom-4 end-4">
                      <Badge variant="secondary" className="bg-black/50 text-white border-0">
                        <Eye className="w-3 h-3 me-1" />
                        {equipment.viewCount} views
                      </Badge>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No images available
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {equipment.images.length > 1 && (
                <div className="p-4 border-t">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {equipment.images.map((img, index) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                          selectedImageIndex === index
                            ? "border-primary"
                            : "border-transparent hover:border-muted-foreground/50"
                        }`}
                      >
                        <Image
                          src={img.url}
                          alt={`${equipment.titleEn} - Image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>

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
                      {equipment.make} {equipment.model} {equipment.year && `(${equipment.year})`}
                    </p>
                  </div>
                  <Badge className={`${conditionInfo.color} text-white`}>
                    {conditionInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Calendar className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Year</p>
                    <p className="font-medium">{equipment.year || "N/A"}</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Hours</p>
                    <p className="font-medium">
                      {equipment.hoursUsed?.toLocaleString() || "N/A"}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <MapPin className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{equipment.locationCity}</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Tag className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Condition</p>
                    <p className="font-medium">{conditionInfo.label}</p>
                  </div>
                </div>

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
                          {Object.entries(equipment.specifications).map(
                            ([key, value]) => (
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
                            )
                          )}
                        </div>
                      </div>
                    </>
                  )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Pricing & Contact */}
          <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            {/* Pricing Card */}
            <Card>
              <CardHeader className="pb-2">
                {equipment.priceOnRequest ? (
                  <div className="text-xl font-semibold text-primary">
                    Contact for Price
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Rental Price */}
                    {(equipment.listingType === "FOR_RENT" || equipment.listingType === "BOTH") &&
                      equipment.rentalPrice && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">
                            {formatPrice(equipment.rentalPrice, equipment.currency)}
                          </span>
                          <span className="text-muted-foreground">
                            /{equipment.rentalPriceUnit || "day"}
                          </span>
                          {equipment.listingType === "BOTH" && (
                            <Badge variant="outline" className="ml-2">Rental</Badge>
                          )}
                        </div>
                      )}

                    {/* Sale Price */}
                    {(equipment.listingType === "FOR_SALE" || equipment.listingType === "BOTH") &&
                      equipment.salePrice && (
                        <div className="flex items-baseline gap-2">
                          <span className={equipment.listingType === "BOTH" ? "text-2xl font-semibold" : "text-3xl font-bold"}>
                            {formatPrice(equipment.salePrice, equipment.currency)}
                          </span>
                          {equipment.listingType === "BOTH" && (
                            <Badge variant="outline" className="ml-2">Buy</Badge>
                          )}
                        </div>
                      )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Contact Buttons - WhatsApp first (Saudi preference) */}
                <div className="flex gap-2">
                  <a
                    href={getWhatsAppLink(equipment.contactWhatsApp || equipment.contactPhone, equipment.titleEn)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent("WHATSAPP_CLICK", {
                      equipmentId: equipment.id,
                      categoryId: equipment.category.id,
                      listingType: equipment.listingType,
                    })}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#25D366] text-white hover:bg-[#20BD5A] transition-colors font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`tel:${equipment.contactPhone}`}
                    onClick={() => trackEvent("CALL_CLICK", {
                      equipmentId: equipment.id,
                      categoryId: equipment.category.id,
                      listingType: equipment.listingType,
                    })}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-input bg-background hover:bg-muted transition-colors font-medium"
                  >
                    <Phone className="w-5 h-5" />
                    <span>Call</span>
                  </a>
                </div>

                <Separator />

                {/* Contact Form */}
                <ContactForm
                  equipmentId={equipment.id}
                  equipmentTitle={equipment.titleEn}
                  listingType={equipment.listingType}
                  ownerPhone={equipment.contactPhone}
                  ownerWhatsApp={equipment.contactWhatsApp || undefined}
                />
              </CardContent>
            </Card>

            {/* Owner Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Listed by</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={equipment.owner.avatarUrl || undefined} />
                    <AvatarFallback>
                      {equipment.owner.fullName?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {equipment.owner.businessProfile?.companyNameEn ||
                        equipment.owner.fullName ||
                        "Owner"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Member since {memberSince}
                    </p>
                  </div>
                </div>

                {equipment.owner.businessProfile?.crVerificationStatus === "VERIFIED" && (
                  <Badge variant="secondary" className="w-full justify-center py-1">
                    <Shield className="w-3 h-3 me-1" />
                    Verified Business
                  </Badge>
                )}
              </CardContent>
            </Card>

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
      </div>
    </div>
  );
}
