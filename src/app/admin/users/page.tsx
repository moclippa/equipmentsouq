import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole, Country } from "@prisma/client";
import {
  UsersFilters,
  UsersTable,
  SearchParams,
  UserItem,
} from "@/components/features/admin-users";

const ITEMS_PER_PAGE = 20;

async function getUsers(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || "1");
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const where: Record<string, unknown> = {};

  if (searchParams.role && searchParams.role !== "all") {
    where.role = searchParams.role as UserRole;
  }

  if (searchParams.country && searchParams.country !== "all") {
    where.country = searchParams.country as Country;
  }

  if (searchParams.status === "active") {
    where.isActive = true;
    where.isSuspended = false;
  } else if (searchParams.status === "suspended") {
    where.isSuspended = true;
  } else if (searchParams.status === "inactive") {
    where.isActive = false;
  }

  if (searchParams.q) {
    where.OR = [
      { fullName: { contains: searchParams.q, mode: "insensitive" } },
      { email: { contains: searchParams.q, mode: "insensitive" } },
      { phone: { contains: searchParams.q } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        businessProfile: {
          select: {
            companyNameEn: true,
            businessType: true,
            crVerificationStatus: true,
          },
        },
        _count: {
          select: {
            equipment: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users as unknown as UserItem[],
    total,
    page,
    totalPages: Math.ceil(total / ITEMS_PER_PAGE),
  };
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { users, total, page, totalPages } = await getUsers(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage platform users, roles, and account status
        </p>
      </div>

      <UsersFilters params={params} />

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-2xl">{total}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <UsersTable
        users={users}
        total={total}
        page={page}
        totalPages={totalPages}
        params={params}
        itemsPerPage={ITEMS_PER_PAGE}
      />
    </div>
  );
}
