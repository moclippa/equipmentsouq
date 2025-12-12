import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Package, MapPin, ArrowRight } from "lucide-react";
import { CachedFeaturedEquipment } from "@/lib/cache";

interface FeaturedEquipmentSectionProps {
  equipment: CachedFeaturedEquipment[];
}

export function FeaturedEquipmentSection({ equipment }: FeaturedEquipmentSectionProps) {
  if (equipment.length === 0) return null;

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Featured Equipment
            </h2>
            <p className="text-muted-foreground">
              Popular listings from verified owners
            </p>
          </div>
          <Link href="/search" className="hidden md:block">
            <Button variant="outline" className="gap-2">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {equipment.map((item) => (
            <Link key={item.id} href={`/equipment/${item.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                <div className="aspect-[4/3] bg-muted relative">
                  {item.images[0] ? (
                    <img
                      src={item.images[0].url}
                      alt={item.titleEn}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <Badge className="absolute top-3 start-3" variant="secondary">
                    {item.category.nameEn}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-1 mb-1">
                    {item.titleEn}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.make} {item.model} {item.year}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {item.locationCity}
                    </div>
                    {item.rentalPrice && (
                      <span className="font-semibold text-primary">
                        {item.currency} {Number(item.rentalPrice).toLocaleString()}/{item.rentalPriceUnit}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8 md:hidden">
          <Link href="/search">
            <Button variant="outline" className="gap-2">
              View All Equipment
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
