import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Eye,
  MessageCircle,
  MapPin,
  Calendar,
  Package,
} from "lucide-react";
import { ListingActions } from "@/components/features/listings/listing-actions";

export default async function MyListingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const listings = await prisma.equipment.findMany({
    where: {
      ownerId: session.user.id,
    },
    include: {
      category: {
        select: { nameEn: true, slug: true },
      },
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      _count: {
        select: { leads: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatPrice = (listing: typeof listings[0]) => {
    if (listing.priceOnRequest) return "Contact for Price";

    if (listing.listingType === "FOR_SALE" && listing.salePrice) {
      return `${listing.currency} ${Number(listing.salePrice).toLocaleString()}`;
    }

    if ((listing.listingType === "FOR_RENT" || listing.listingType === "BOTH") && listing.rentalPrice) {
      return `${listing.currency} ${Number(listing.rentalPrice).toLocaleString()}/${listing.rentalPriceUnit}`;
    }

    return "Price not set";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-500">Active</Badge>;
      case "PAUSED":
        return <Badge variant="secondary">Paused</Badge>;
      case "SOLD":
        return <Badge className="bg-blue-500">Sold</Badge>;
      case "RENTED":
        return <Badge className="bg-purple-500">Rented</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getListingTypeBadge = (type: string) => {
    switch (type) {
      case "FOR_RENT":
        return <Badge variant="outline">For Rent</Badge>;
      case "FOR_SALE":
        return <Badge variant="outline">For Sale</Badge>;
      case "BOTH":
        return <Badge variant="outline">Rent/Sale</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Listings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your equipment listings
          </p>
        </div>
        <Button asChild>
          <Link href="/equipment/new">
            <Plus className="w-4 h-4 me-2" />
            Add Equipment
          </Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No listings yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first equipment listing
              </p>
              <Button asChild>
                <Link href="/equipment/new">
                  <Plus className="w-4 h-4 me-2" />
                  Add Equipment
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const primaryImage = listing.images[0];
            const imageUrl = primaryImage?.url;
            const isValidImage = imageUrl && !imageUrl.startsWith("blob:");

            return (
              <Card key={listing.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  {/* Image */}
                  <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-muted flex-shrink-0">
                    {isValidImage ? (
                      <Image
                        src={imageUrl}
                        alt={listing.titleEn}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-2 start-2 flex gap-1">
                      {getStatusBadge(listing.status)}
                    </div>
                  </div>

                  {/* Content */}
                  <CardContent className="flex-1 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getListingTypeBadge(listing.listingType)}
                          <span className="text-sm text-muted-foreground">
                            {listing.category.nameEn}
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold truncate">
                          <Link
                            href={`/equipment/${listing.id}`}
                            className="hover:text-primary"
                          >
                            {listing.titleEn}
                          </Link>
                        </h3>

                        <p className="text-muted-foreground text-sm mt-1">
                          {listing.make} {listing.model}
                          {listing.year && ` (${listing.year})`}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {listing.locationCity}, {listing.locationCountry}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {listing.viewCount} views
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {listing._count.leads} leads
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(listing.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <p className="text-lg font-bold">
                          {formatPrice(listing)}
                        </p>

                        <ListingActions
                          listingId={listing.id}
                          status={listing.status}
                          leadCount={listing._count.leads}
                        />
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
