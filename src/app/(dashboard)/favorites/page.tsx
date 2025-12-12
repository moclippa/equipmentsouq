"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MapPin,
  Heart,
  Loader2,
  Trash2,
} from "lucide-react";

interface Equipment {
  id: string;
  titleEn: string;
  titleAr: string | null;
  make: string;
  model: string;
  year: number | null;
  condition: string;
  listingType: "FOR_RENT" | "FOR_SALE" | "BOTH";
  rentalPrice: string | null;
  rentalPriceUnit: string | null;
  salePrice: string | null;
  priceOnRequest: boolean;
  currency: string;
  locationCity: string;
  locationRegion: string;
  locationCountry: string;
  category: {
    id: string;
    nameEn: string;
    nameAr: string | null;
    slug: string;
  };
  owner: {
    id: string;
    fullName: string | null;
  };
  images: Array<{
    url: string;
    isPrimary: boolean;
  }>;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("favorites") || "[]");
    setFavorites(stored);
  }, []);

  // Fetch equipment details for favorites
  useEffect(() => {
    async function fetchFavorites() {
      if (favorites.length === 0) {
        setEquipment([]);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/equipment?ids=${favorites.join(",")}`);
        const data = await res.json();
        setEquipment(data.equipment || []);
      } catch (error) {
        console.error("Failed to fetch favorites:", error);
        toast.error("Failed to load favorites");
      } finally {
        setIsLoading(false);
      }
    }

    fetchFavorites();
  }, [favorites]);

  const removeFavorite = (id: string) => {
    const updated = favorites.filter((fid) => fid !== id);
    localStorage.setItem("favorites", JSON.stringify(updated));
    setFavorites(updated);
    setEquipment(equipment.filter((e) => e.id !== id));
    toast.success("Removed from favorites");
  };

  const clearAllFavorites = () => {
    localStorage.setItem("favorites", JSON.stringify([]));
    setFavorites([]);
    setEquipment([]);
    toast.success("All favorites cleared");
  };

  const formatPrice = (amount: string, currency: string) => {
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 fill-current" />
            My Favorites
          </h1>
          <p className="text-muted-foreground">
            {favorites.length} saved {favorites.length === 1 ? "item" : "items"}
          </p>
        </div>
        {favorites.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFavorites}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 me-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Loading favorites...</span>
        </div>
      ) : equipment.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
          <p className="text-muted-foreground mb-6">
            Browse equipment and tap the heart icon to save items here
          </p>
          <Link href="/search">
            <Button>Browse Equipment</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((item) => (
            <Card key={item.id} className="overflow-hidden group relative">
              {/* Remove button */}
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 end-2 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity bg-white/90 hover:bg-white text-red-500 hover:text-red-600"
                onClick={(e) => {
                  e.preventDefault();
                  removeFavorite(item.id);
                }}
                aria-label={`Remove ${item.titleEn} from favorites`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>

              <Link href={`/equipment/${item.id}`}>
                {/* Image */}
                <div className="relative aspect-[4/3] bg-muted">
                  {item.images[0] ? (
                    <Image
                      src={item.images[0].url}
                      alt={item.titleEn}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 start-2 flex flex-col gap-1">
                    {item.listingType === "FOR_SALE" && (
                      <Badge className="bg-green-600 text-white">
                        For Sale
                      </Badge>
                    )}
                    {item.listingType === "BOTH" && (
                      <Badge variant="secondary">
                        Rent or Buy
                      </Badge>
                    )}
                  </div>

                  {/* Price */}
                  <div className="absolute bottom-2 end-2">
                    {item.priceOnRequest ? (
                      <Badge variant="secondary" className="text-sm font-medium px-2 py-1">
                        Contact for price
                      </Badge>
                    ) : item.rentalPrice ? (
                      <Badge variant="secondary" className="text-base font-bold px-2 py-1">
                        {formatPrice(item.rentalPrice, item.currency)}/{item.rentalPriceUnit || "day"}
                      </Badge>
                    ) : item.salePrice ? (
                      <Badge variant="secondary" className="text-base font-bold px-2 py-1">
                        {formatPrice(item.salePrice, item.currency)}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">
                    {item.category.nameEn}
                  </div>
                  <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                    {item.titleEn}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {item.make} {item.model} {item.year && `(${item.year})`}
                  </p>

                  <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <MapPin className="w-3 h-3 me-1" />
                      {item.locationCity}
                    </span>
                    <span className="text-xs">
                      {item.condition}
                    </span>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
