import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Search,
  Eye,
  ExternalLink,
  Pause,
  Play,
  Trash2,
  MapPin,
  User,
} from "lucide-react";
import Link from "next/link";
import { ListingStatus, ListingType, Country } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";

interface SearchParams {
  status?: string;
  type?: string;
  country?: string;
  q?: string;
  ownerId?: string;
  page?: string;
}

const ITEMS_PER_PAGE = 20;

async function getEquipment(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || "1");
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const where: Record<string, unknown> = {};

  if (searchParams.status && searchParams.status !== "all") {
    where.status = searchParams.status as ListingStatus;
  }

  if (searchParams.type && searchParams.type !== "all") {
    where.listingType = searchParams.type as ListingType;
  }

  if (searchParams.country && searchParams.country !== "all") {
    where.locationCountry = searchParams.country as Country;
  }

  if (searchParams.ownerId) {
    where.ownerId = searchParams.ownerId;
  }

  if (searchParams.q) {
    where.OR = [
      { titleEn: { contains: searchParams.q, mode: "insensitive" } },
      { make: { contains: searchParams.q, mode: "insensitive" } },
      { model: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  const [equipment, total, categories] = await Promise.all([
    prisma.equipment.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        category: {
          select: {
            nameEn: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        _count: {
          select: {
            leads: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.equipment.count({ where }),
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, nameEn: true },
      orderBy: { nameEn: "asc" },
    }),
  ]);

  return {
    equipment,
    total,
    categories,
    page,
    totalPages: Math.ceil(total / ITEMS_PER_PAGE),
  };
}

function getStatusBadgeVariant(status: ListingStatus) {
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

function getTypeBadge(type: ListingType) {
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

function formatPrice(
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

export default async function EquipmentManagementPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { equipment, total, page, totalPages } = await getEquipment(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Equipment Management</h1>
        <p className="text-muted-foreground">
          Manage and moderate equipment listings across the platform
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="q"
                  placeholder="Search by title, make, or model..."
                  defaultValue={params.q}
                  className="ps-9"
                />
              </div>
            </div>

            <Select name="status" defaultValue={params.status || "all"}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="SOLD">Sold</SelectItem>
                <SelectItem value="RENTED">Rented</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select name="type" defaultValue={params.type || "all"}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="FOR_RENT">For Rent</SelectItem>
                <SelectItem value="FOR_SALE">For Sale</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>

            <Select name="country" defaultValue={params.country || "all"}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="SA">Saudi Arabia</SelectItem>
                <SelectItem value="BH">Bahrain</SelectItem>
              </SelectContent>
            </Select>

            <Button type="submit">Filter</Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Listings</CardDescription>
            <CardTitle className="text-2xl">{total}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Equipment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Listings ({total})</CardTitle>
          <CardDescription>
            Page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  <th className="text-start py-3 px-2 font-medium">Equipment</th>
                  <th className="text-start py-3 px-2 font-medium">Owner</th>
                  <th className="text-start py-3 px-2 font-medium">Type</th>
                  <th className="text-start py-3 px-2 font-medium">Price</th>
                  <th className="text-start py-3 px-2 font-medium">Location</th>
                  <th className="text-start py-3 px-2 font-medium">Status</th>
                  <th className="text-start py-3 px-2 font-medium">Leads</th>
                  <th className="text-start py-3 px-2 font-medium">Created</th>
                  <th className="text-end py-3 px-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
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
                ))}

                {equipment.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      No equipment found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(page * ITEMS_PER_PAGE, total)} of {total} listings
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={{
                        pathname: "/admin/equipment",
                        query: { ...params, page: page - 1 },
                      }}
                    >
                      Previous
                    </Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={{
                        pathname: "/admin/equipment",
                        query: { ...params, page: page + 1 },
                      }}
                    >
                      Next
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
