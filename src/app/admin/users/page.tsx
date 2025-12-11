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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, UserCheck, UserX, Eye, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { UserRole, Country } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";

interface SearchParams {
  role?: string;
  country?: string;
  status?: string;
  q?: string;
  page?: string;
}

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
    users,
    total,
    page,
    totalPages: Math.ceil(total / ITEMS_PER_PAGE),
  };
}

function getRoleBadgeVariant(role: UserRole) {
  switch (role) {
    case "ADMIN":
      return "destructive";
    case "OWNER":
      return "default";
    case "RENTER":
      return "secondary";
    default:
      return "outline";
  }
}

function getStatusBadge(user: { isActive: boolean; isSuspended: boolean }) {
  if (user.isSuspended) {
    return <Badge variant="destructive">Suspended</Badge>;
  }
  if (!user.isActive) {
    return <Badge variant="outline">Inactive</Badge>;
  }
  return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>;
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="q"
                  placeholder="Search by name, email, or phone..."
                  defaultValue={params.q}
                  className="ps-9"
                />
              </div>
            </div>

            <Select name="role" defaultValue={params.role || "all"}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="RENTER">Renter</SelectItem>
                <SelectItem value="GUEST">Guest</SelectItem>
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

            <Select name="status" defaultValue={params.status || "all"}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
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
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-2xl">{total}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({total})</CardTitle>
          <CardDescription>
            Page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  <th className="text-start py-3 px-2 font-medium">User</th>
                  <th className="text-start py-3 px-2 font-medium">Contact</th>
                  <th className="text-start py-3 px-2 font-medium">Role</th>
                  <th className="text-start py-3 px-2 font-medium">Business</th>
                  <th className="text-start py-3 px-2 font-medium">Listings</th>
                  <th className="text-start py-3 px-2 font-medium">Status</th>
                  <th className="text-start py-3 px-2 font-medium">Joined</th>
                  <th className="text-end py-3 px-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {user.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.country === "SA" ? "🇸🇦" : "🇧🇭"} {user.country}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="space-y-1 text-sm">
                        {user.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">{user.email}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">
                      {user.businessProfile ? (
                        <div className="text-sm">
                          <p className="font-medium">{user.businessProfile.companyNameEn}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.businessProfile.businessType}
                            {user.businessProfile.crVerificationStatus === "VERIFIED" && (
                              <span className="text-green-600 ms-1">✓ Verified</span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm">{user._count.equipment}</span>
                    </td>
                    <td className="py-3 px-2">
                      {getStatusBadge(user)}
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      {formatDistanceToNow(user.createdAt, { addSuffix: true })}
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
                            <Link href={`/admin/users/${user.id}`}>
                              <Eye className="w-4 h-4 me-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {!user.isSuspended ? (
                            <DropdownMenuItem className="text-destructive">
                              <UserX className="w-4 h-4 me-2" />
                              Suspend User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem>
                              <UserCheck className="w-4 h-4 me-2" />
                              Reactivate User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No users found matching your criteria
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
                {Math.min(page * ITEMS_PER_PAGE, total)} of {total} users
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={{
                        pathname: "/admin/users",
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
                        pathname: "/admin/users",
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
