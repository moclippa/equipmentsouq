"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Share2, Heart, Pencil, Eye, Tag } from "lucide-react";
import { toast } from "sonner";
import { useAnalytics } from "@/hooks/use-analytics";
import { EquipmentImage, ListingType, LISTING_TYPE_LABELS } from "@/types/equipment";

interface EquipmentImageGalleryProps {
  images: EquipmentImage[];
  title: string;
  listingType: ListingType;
  viewCount: number;
  equipmentId: string;
  isOwner: boolean;
}

export function EquipmentImageGallery({
  images,
  title,
  listingType,
  viewCount,
  equipmentId,
  isOwner,
}: EquipmentImageGalleryProps) {
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(() => {
    if (typeof window === "undefined") return false;
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    return favorites.includes(equipmentId);
  });

  const handleShare = async () => {
    const shareData = {
      title,
      text: `Check out this equipment on EquipmentSouq`,
      url: window.location.href,
    };

    trackEvent("SHARE_CLICK", { equipmentId });

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleFavorite = () => {
    const favorites: string[] = JSON.parse(localStorage.getItem("favorites") || "[]");

    if (isFavorite) {
      const updated = favorites.filter((fid) => fid !== equipmentId);
      localStorage.setItem("favorites", JSON.stringify(updated));
      setIsFavorite(false);
      toast.success("Removed from favorites");
    } else {
      favorites.push(equipmentId);
      localStorage.setItem("favorites", JSON.stringify(favorites));
      setIsFavorite(true);
      toast.success("Added to favorites");
      trackEvent("FAVORITE_CLICK", { equipmentId });
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[16/10] bg-muted">
        {images.length > 0 ? (
          <>
            <Image
              src={images[selectedImageIndex]?.url || images[0].url}
              alt={title}
              fill
              className="object-contain"
              priority
            />

            {/* Listing Type Badge */}
            <div className="absolute top-4 start-4 flex flex-col gap-2">
              <Badge className="bg-primary text-primary-foreground">
                <Tag className="w-3 h-3 me-1" />
                {LISTING_TYPE_LABELS[listingType]}
              </Badge>
            </div>

            {/* Share & Favorite/Edit */}
            <div className="absolute top-4 end-4 flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={handleShare}
                aria-label="Share listing"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              {isOwner ? (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => router.push(`/my-listings/${equipmentId}/edit`)}
                  aria-label="Edit listing"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleFavorite}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  aria-pressed={isFavorite}
                  className={isFavorite ? "text-red-500 hover:text-red-600" : ""}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
                </Button>
              )}
            </div>

            {/* View count */}
            <div className="absolute bottom-4 end-4">
              <Badge variant="secondary" className="bg-black/50 text-white border-0">
                <Eye className="w-3 h-3 me-1" />
                {viewCount} views
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
      {images.length > 1 && (
        <div className="p-4 border-t">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((img, index) => (
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
                  alt={`${title} - Image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
