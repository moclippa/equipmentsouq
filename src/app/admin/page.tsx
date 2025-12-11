import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ShieldCheck,
  Package,
  Inbox,
  Eye,
  TrendingUp,
  MapPin,
  Calendar,
  Phone,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { format, subDays, startOfDay } from "date-fns";

async function getStats() {
  const today = startOfDay(new Date());
  const last7Days = subDays(today, 7);
  const last30Days = subDays(today, 30);

  const [
    // Core metrics
    totalUsers,
    pendingVerifications,
    totalEquipment,
    activeEquipment,
    totalLeads,
    newLeads,

    // Growth metrics (last 7 days)
    usersLast7Days,
    equipmentLast7Days,
    leadsLast7Days,

    // By country
    usersByCountry,
    equipmentByCountry,
    leadsByCountry,

    // By status
    equipmentByStatus,
    leadsByStatus,

    // Recent activity
    recentLeads,
    recentUsers,

    // Top performers
    topEquipmentByLeads,
  ] = await Promise.all([
    // Core metrics
    prisma.user.count(),
    prisma.businessProfile.count({ where: { crVerificationStatus: "PENDING" } }),
    prisma.equipment.count(),
    prisma.equipment.count({ where: { status: "ACTIVE" } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "NEW" } }),

    // Growth metrics
    prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
    prisma.equipment.count({ where: { createdAt: { gte: last7Days } } }),
    prisma.lead.count({ where: { createdAt: { gte: last7Days } } }),

    // By country
    prisma.user.groupBy({ by: ["country"], _count: { country: true } }),
    prisma.equipment.groupBy({ by: ["locationCountry"], _count: { locationCountry: true } }),
    prisma.lead.findMany({
      select: { equipment: { select: { locationCountry: true } } },
    }),

    // By status
    prisma.equipment.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.lead.groupBy({ by: ["status"], _count: { status: true } }),

    // Recent activity
    prisma.lead.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        equipment: {
          select: { titleEn: true, owner: { select: { fullName: true } } },
        },
      },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, fullName: true, role: true, country: true, createdAt: true },
    }),

    // Top performers
    prisma.equipment.findMany({
      take: 5,
      where: { status: "ACTIVE" },
      orderBy: { leadCount: "desc" },
      select: {
        id: true,
        titleEn: true,
        make: true,
        model: true,
        leadCount: true,
        viewCount: true,
        owner: { select: { fullName: true } },
      },
    }),
  ]);

  // Process leads by country
  const leadCountryMap = leadsByCountry.reduce(
    (acc, lead) => {
      const country = lead.equipment.locationCountry;
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    totalUsers,
    pendingVerifications,
    totalEquipment,
    activeEquipment,
    totalLeads,
    newLeads,
    usersLast7Days,
    equipmentLast7Days,
    leadsLast7Days,
    usersByCountry,
    equipmentByCountry,
    leadsByCountry: leadCountryMap,
    equipmentByStatus,
    leadsByStatus,
    recentLeads,
    recentUsers,
    topEquipmentByLeads,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const mainCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      change: stats.usersLast7Days,
      icon: Users,
      href: "/admin/users",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Pending Verifications",
      value: stats.pendingVerifications,
      icon: ShieldCheck,
      href: "/admin/verifications",
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      highlight: stats.pendingVerifications > 0,
    },
    {
      title: "Active Listings",
      value: stats.activeEquipment,
      change: stats.equipmentLast7Days,
      icon: Package,
      href: "/admin/equipment",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Leads",
      value: stats.totalLeads,
      change: stats.leadsLast7Days,
      icon: Inbox,
      href: "/admin/leads",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "New Leads",
      value: stats.newLeads,
      icon: Eye,
      href: "/admin/leads?status=NEW",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      highlight: stats.newLeads > 0,
    },
  ];

  // Convert groupBy results to readable format
  const saUsers = stats.usersByCountry.find((c) => c.country === "SA")?._count.country || 0;
  const bhUsers = stats.usersByCountry.find((c) => c.country === "BH")?._count.country || 0;
  const saEquipment = stats.equipmentByCountry.find((c) => c.locationCountry === "SA")?._count.locationCountry || 0;
  const bhEquipment = stats.equipmentByCountry.find((c) => c.locationCountry === "BH")?._count.locationCountry || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of EquipmentSouq platform activity
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {mainCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href}>
              <Card className={`hover:shadow-md transition-shadow ${card.highlight ? "ring-2 ring-amber-400" : ""}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  {card.change !== undefined && card.change > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span className="text-green-600">+{card.change}</span> last 7 days
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Analytics Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* By Country */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              By Country
            </CardTitle>
            <CardDescription>Distribution across markets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">🇸🇦 Saudi Arabia</span>
                <div className="flex items-center gap-4 text-sm">
                  <span><Users className="w-3 h-3 inline me-1" />{saUsers}</span>
                  <span><Package className="w-3 h-3 inline me-1" />{saEquipment}</span>
                  <span><Inbox className="w-3 h-3 inline me-1" />{stats.leadsByCountry["SA"] || 0}</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${stats.totalUsers > 0 ? (saUsers / stats.totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">🇧🇭 Bahrain</span>
                <div className="flex items-center gap-4 text-sm">
                  <span><Users className="w-3 h-3 inline me-1" />{bhUsers}</span>
                  <span><Package className="w-3 h-3 inline me-1" />{bhEquipment}</span>
                  <span><Inbox className="w-3 h-3 inline me-1" />{stats.leadsByCountry["BH"] || 0}</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{ width: `${stats.totalUsers > 0 ? (bhUsers / stats.totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Listing Status
            </CardTitle>
            <CardDescription>Equipment by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.equipmentByStatus.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <Badge
                    variant={
                      status.status === "ACTIVE"
                        ? "default"
                        : status.status === "DRAFT"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {status.status}
                  </Badge>
                  <span className="font-medium">{status._count.status}</span>
                </div>
              ))}
              {stats.equipmentByStatus.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No equipment yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lead Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Lead Status
            </CardTitle>
            <CardDescription>Leads by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.leadsByStatus.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <Badge
                    variant={
                      status.status === "NEW"
                        ? "default"
                        : status.status === "CONVERTED"
                        ? "default"
                        : status.status === "CLOSED"
                        ? "destructive"
                        : "secondary"
                    }
                    className={status.status === "CONVERTED" ? "bg-green-600" : ""}
                  >
                    {status.status}
                  </Badge>
                  <span className="font-medium">{status._count.status}</span>
                </div>
              ))}
              {stats.leadsByStatus.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No leads yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/admin/verifications"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <span>Review pending verifications</span>
              </div>
              {stats.pendingVerifications > 0 && (
                <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
                  {stats.pendingVerifications} pending
                </span>
              )}
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Manage users</span>
              </div>
            </Link>
            <Link
              href="/admin/equipment"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-green-600" />
                <span>Manage equipment listings</span>
              </div>
            </Link>
            <Link
              href="/admin/leads"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Inbox className="w-5 h-5 text-purple-600" />
                <span>View all leads</span>
              </div>
              {stats.newLeads > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                  {stats.newLeads} new
                </span>
              )}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Latest registrations</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentUsers.length > 0 ? (
              <div className="space-y-3">
                {stats.recentUsers.map((user) => (
                  <Link
                    key={user.id}
                    href={`/admin/users/${user.id}`}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {user.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.country === "SA" ? "🇸🇦" : "🇧🇭"} {user.role}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(user.createdAt, "MMM d")}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No users yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Listings & Recent Leads */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Performing Listings
            </CardTitle>
            <CardDescription>Most leads received</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topEquipmentByLeads.length > 0 ? (
              <div className="space-y-3">
                {stats.topEquipmentByLeads.map((eq, index) => (
                  <Link
                    key={eq.id}
                    href={`/admin/equipment/${eq.id}`}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium line-clamp-1">{eq.titleEn}</p>
                        <p className="text-xs text-muted-foreground">
                          {eq.make} {eq.model} • {eq.owner.fullName}
                        </p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-medium">{eq.leadCount} leads</p>
                      <p className="text-xs text-muted-foreground">{eq.viewCount} views</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No equipment with leads yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Recent Leads
            </CardTitle>
            <CardDescription>Latest contact requests</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentLeads.length > 0 ? (
              <div className="space-y-3">
                {stats.recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        interested in {lead.equipment.titleEn}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Owner: {lead.equipment.owner.fullName}
                      </p>
                    </div>
                    <div className="text-end">
                      <Badge
                        variant={lead.status === "NEW" ? "default" : "secondary"}
                        className="mb-1"
                      >
                        {lead.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {format(lead.createdAt, "MMM d, HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No leads yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
