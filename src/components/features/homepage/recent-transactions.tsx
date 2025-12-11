"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { AvailabilityStatusBadge } from "@/components/features/search/availability-status-badge";
import { formatDistanceToNow } from "date-fns";
import { Package } from "lucide-react";

interface Equipment {
  id: string;
  titleEn: string;
  titleAr?: string | null;
  make: string;
  model: string;
  status: "RENTED" | "SOLD";
  statusChangedAt: string | null;
  updatedAt: string;
  category: { nameEn: string; nameAr: string; slug: string };
  images: Array<{ url: string }>;
  locationCity: string;
}

interface RecentTransactionsProps {
  equipment: Equipment[];
}

export function RecentTransactions({ equipment }: RecentTransactionsProps) {
  if (equipment.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Just Sold & Rented
          </h2>
          <p className="text-muted-foreground">
            Recent successful transactions on EquipmentSouq
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {equipment.map((item) => {
            // Use statusChangedAt if available, otherwise fall back to updatedAt
            const transactionDate = item.statusChangedAt || item.updatedAt;

            return (
              <Link key={item.id} href={`/equipment/${item.id}`}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow h-full group">
                  <div className="relative aspect-[4/3] bg-muted">
                    {item.images[0] ? (
                      <Image
                        src={item.images[0].url}
                        alt={item.titleEn}
                        fill
                        className="object-cover grayscale-[20%] group-hover:grayscale-0 transition-all"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-2 start-2">
                      <AvailabilityStatusBadge status={item.status} />
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm line-clamp-1">
                      {item.make} {item.model}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(transactionDate), {
                        addSuffix: true,
                      })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
