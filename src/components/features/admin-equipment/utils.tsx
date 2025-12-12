import { Badge } from "@/components/ui/badge";
import { ListingStatus, ListingType } from "@prisma/client";

export function getStatusBadgeVariant(status: ListingStatus) {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "DRAFT":
      return "secondary";
    case "PAUSED":
      return "outline";
    case "SOLD":
    case "RENTED":
      return "secondary";
    case "ARCHIVED":
      return "destructive";
    default:
      return "outline";
  }
}

export function getTypeBadge(type: ListingType) {
  switch (type) {
    case "FOR_RENT":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">For Rent</Badge>;
    case "FOR_SALE":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">For Sale</Badge>;
    case "BOTH":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Rent/Sale</Badge>;
    default:
      return null;
  }
}

export function formatPrice(
  rentalPrice: number | null,
  rentalPriceUnit: string | null,
  salePrice: number | null,
  priceOnRequest: boolean,
  currency: string
) {
  if (priceOnRequest) {
    return "Price on request";
  }

  const parts = [];
  if (rentalPrice) {
    parts.push(`${currency} ${Number(rentalPrice).toLocaleString()}/${rentalPriceUnit || "day"}`);
  }
  if (salePrice) {
    parts.push(`${currency} ${Number(salePrice).toLocaleString()}`);
  }

  return parts.join(" | ") || "—";
}
