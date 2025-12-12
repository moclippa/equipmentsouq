import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  ExternalLink,
  Pause,
  Play,
  Trash2,
  MapPin,
  User,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { EquipmentItem } from "./types";
import { getStatusBadgeVariant, getTypeBadge, formatPrice } from "./utils";

interface EquipmentTableRowProps {
  item: EquipmentItem;
}

export function EquipmentTableRow({ item }: EquipmentTableRowProps) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/50">
      <td className="py-3 px-2">
        <div className="flex items-center gap-3">
          {item.images[0] ? (
            <img
              src={item.images[0].url}
              alt={item.titleEn}
              className="w-12 h-12 rounded object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No img</span>
            </div>
          )}
          <div>
            <p className="font-medium line-clamp-1">{item.titleEn}</p>
            <p className="text-xs text-muted-foreground">
              {item.make} {item.model} {item.year}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.category.nameEn}
            </p>
          </div>
        </div>
      </td>
      <td className="py-3 px-2">
        <Link
          href={`/admin/users/${item.owner.id}`}
          className="flex items-center gap-1 text-sm hover:underline"
        >
          <User className="w-3 h-3" />
          {item.owner.fullName}
        </Link>
        <p className="text-xs text-muted-foreground">{item.owner.phone}</p>
      </td>
      <td className="py-3 px-2">
        {getTypeBadge(item.listingType)}
      </td>
      <td className="py-3 px-2 text-sm">
        {formatPrice(
          item.rentalPrice ? Number(item.rentalPrice) : null,
          item.rentalPriceUnit,
          item.salePrice ? Number(item.salePrice) : null,
          item.priceOnRequest,
          item.currency
        )}
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          {item.locationCity}
        </div>
        <p className="text-xs text-muted-foreground">
          {item.locationCountry === "SA" ? "🇸🇦" : "🇧🇭"} {item.locationCountry}
        </p>
      </td>
      <td className="py-3 px-2">
        <Badge variant={getStatusBadgeVariant(item.status)}>
          {item.status}
        </Badge>
      </td>
      <td className="py-3 px-2 text-sm">
        {item._count.leads}
      </td>
      <td className="py-3 px-2 text-sm text-muted-foreground">
        {formatDistanceToNow(item.createdAt, { addSuffix: true })}
      </td>
      <td className="py-3 px-2 text-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/equipment/${item.id}`} target="_blank">
                <ExternalLink className="w-4 h-4 me-2" />
                View Public Page
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/equipment/${item.id}`}>
                <Eye className="w-4 h-4 me-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {item.status === "ACTIVE" ? (
              <DropdownMenuItem>
                <Pause className="w-4 h-4 me-2" />
                Pause Listing
              </DropdownMenuItem>
            ) : item.status === "PAUSED" ? (
              <DropdownMenuItem>
                <Play className="w-4 h-4 me-2" />
                Reactivate Listing
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="w-4 h-4 me-2" />
              Archive Listing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
