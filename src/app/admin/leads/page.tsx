import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";
import {
  LeadsStatusCards,
  LeadsFilters,
  LeadsTable,
  SearchParams,
  LeadItem,
  StatusCount,
} from "@/components/features/admin-leads";

const ITEMS_PER_PAGE = 20;

async function getLeads(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || "1");
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const where: Record<string, unknown> = {};

  if (searchParams.status && searchParams.status !== "all") {
    where.status = searchParams.status as LeadStatus;
  }

  if (searchParams.interest && searchParams.interest !== "all") {
    where.interestedIn = searchParams.interest;
  }

  if (searchParams.q) {
    where.OR = [
      { name: { contains: searchParams.q, mode: "insensitive" } },
      { phone: { contains: searchParams.q } },
      { email: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  const [leads, total, statusCounts] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            titleEn: true,
            make: true,
            model: true,
            owner: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  // Convert status counts to object
  const counts = statusCounts.reduce(
    (acc, curr) => {
      acc[curr.status] = curr._count.status;
      return acc;
    },
    {} as StatusCount
  );

  return {
    leads: leads as unknown as LeadItem[],
    total,
    counts,
    page,
    totalPages: Math.ceil(total / ITEMS_PER_PAGE),
  };
}

export default async function LeadsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { leads, total, counts, page, totalPages } = await getLeads(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads Overview</h1>
        <p className="text-muted-foreground">
          Monitor all contact requests across the platform
        </p>
      </div>

      <LeadsStatusCards counts={counts} activeStatus={params.status} />

      <LeadsFilters params={params} />

      <LeadsTable
        leads={leads}
        total={total}
        page={page}
        totalPages={totalPages}
        params={params}
        itemsPerPage={ITEMS_PER_PAGE}
      />
    </div>
  );
}
