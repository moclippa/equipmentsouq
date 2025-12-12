import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingStatus, ListingType, Country } from "@prisma/client";
import {
  EquipmentFilters,
  EquipmentTable,
  SearchParams,
  EquipmentItem,
} from "@/components/features/admin-equipment";

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

  const [equipment, total] = await Promise.all([
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
  ]);

  return {
    equipment: equipment as unknown as EquipmentItem[],
    total,
    page,
    totalPages: Math.ceil(total / ITEMS_PER_PAGE),
  };
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

      <EquipmentFilters params={params} />

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Listings</CardDescription>
            <CardTitle className="text-2xl">{total}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <EquipmentTable
        equipment={equipment}
        total={total}
        page={page}
        totalPages={totalPages}
        params={params}
        itemsPerPage={ITEMS_PER_PAGE}
      />
    </div>
  );
}
