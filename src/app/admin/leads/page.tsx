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
  Search,
  Phone,
  Mail,
  Package,
  User,
  Eye,
  CheckCircle,
  MessageSquare,
  XCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { LeadStatus } from "@prisma/client";
import { formatDistanceToNow, format } from "date-fns";

interface SearchParams {
  status?: string;
  interest?: string;
  q?: string;
  page?: string;
}

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
    {} as Record<LeadStatus, number>
  );

  return {
    leads,
    total,
    counts,
    page,
    totalPages: Math.ceil(total / ITEMS_PER_PAGE),
  };
}

function getStatusBadge(status: LeadStatus) {
  const variants: Record<LeadStatus, { variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Eye; label: string }> = {
    NEW: { variant: "default", icon: Clock, label: "New" },
    VIEWED: { variant: "secondary", icon: Eye, label: "Viewed" },
    CONTACTED: { variant: "outline", icon: MessageSquare, label: "Contacted" },
    CONVERTED: { variant: "default", icon: CheckCircle, label: "Converted" },
    CLOSED: { variant: "destructive", icon: XCircle, label: "Closed" },
  };

  const config = variants[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

function getInterestBadge(interest: string) {
  switch (interest) {
    case "rent":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Rent</Badge>;
    case "buy":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Buy</Badge>;
    case "both":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Both</Badge>;
    default:
      return <Badge variant="outline">{interest}</Badge>;
  }
}

export default async function LeadsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { leads, total, counts, page, totalPages } = await getLeads(params);

  const statusCards = [
    { status: "NEW" as LeadStatus, label: "New Leads", count: counts.NEW || 0, color: "text-blue-600", bgColor: "bg-blue-100" },
    { status: "VIEWED" as LeadStatus, label: "Viewed", count: counts.VIEWED || 0, color: "text-gray-600", bgColor: "bg-gray-100" },
    { status: "CONTACTED" as LeadStatus, label: "Contacted", count: counts.CONTACTED || 0, color: "text-amber-600", bgColor: "bg-amber-100" },
    { status: "CONVERTED" as LeadStatus, label: "Converted", count: counts.CONVERTED || 0, color: "text-green-600", bgColor: "bg-green-100" },
    { status: "CLOSED" as LeadStatus, label: "Closed", count: counts.CLOSED || 0, color: "text-red-600", bgColor: "bg-red-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads Overview</h1>
        <p className="text-muted-foreground">
          Monitor all contact requests across the platform
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {statusCards.map((card) => (
          <Link
            key={card.status}
            href={`/admin/leads?status=${card.status}`}
          >
            <Card className={`hover:shadow-md transition-shadow ${params.status === card.status ? "ring-2 ring-primary" : ""}`}>
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className={`text-2xl ${card.color}`}>
                  {card.count}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
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
                  placeholder="Search by name, phone, or email..."
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
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="VIEWED">Viewed</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="CONVERTED">Converted</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select name="interest" defaultValue={params.interest || "all"}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Interest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Interest</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>

            <Button type="submit">Filter</Button>
          </form>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Leads ({total})</CardTitle>
          <CardDescription>
            Page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  <th className="text-start py-3 px-2 font-medium">Lead Contact</th>
                  <th className="text-start py-3 px-2 font-medium">Equipment</th>
                  <th className="text-start py-3 px-2 font-medium">Owner</th>
                  <th className="text-start py-3 px-2 font-medium">Interest</th>
                  <th className="text-start py-3 px-2 font-medium">Status</th>
                  <th className="text-start py-3 px-2 font-medium">Message</th>
                  <th className="text-start py-3 px-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">{lead.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Link
                        href={`/admin/equipment/${lead.equipment.id}`}
                        className="flex items-center gap-1 text-sm hover:underline"
                      >
                        <Package className="w-3 h-3" />
                        <span className="line-clamp-1">{lead.equipment.titleEn}</span>
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {lead.equipment.make} {lead.equipment.model}
                      </p>
                    </td>
                    <td className="py-3 px-2">
                      <Link
                        href={`/admin/users/${lead.equipment.owner.id}`}
                        className="flex items-center gap-1 text-sm hover:underline"
                      >
                        <User className="w-3 h-3" />
                        {lead.equipment.owner.fullName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {lead.equipment.owner.phone}
                      </p>
                    </td>
                    <td className="py-3 px-2">
                      {getInterestBadge(lead.interestedIn)}
                    </td>
                    <td className="py-3 px-2">
                      {getStatusBadge(lead.status)}
                      {lead.ownerViewedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Viewed {formatDistanceToNow(lead.ownerViewedAt, { addSuffix: true })}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {lead.message ? (
                        <p className="text-sm text-muted-foreground line-clamp-2 max-w-[200px]">
                          {lead.message}
                        </p>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      <p>{format(lead.createdAt, "PP")}</p>
                      <p className="text-xs">{format(lead.createdAt, "p")}</p>
                    </td>
                  </tr>
                ))}

                {leads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No leads found matching your criteria
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
                {Math.min(page * ITEMS_PER_PAGE, total)} of {total} leads
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={{
                        pathname: "/admin/leads",
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
                        pathname: "/admin/leads",
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
