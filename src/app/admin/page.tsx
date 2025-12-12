import { prisma } from "@/lib/prisma";
import { Users, ShieldCheck, Package, Inbox, Eye } from "lucide-react";
import { subDays, startOfDay } from "date-fns";
import {
  StatsCard,
  CountryDistributionCard,
  StatusDistributionCard,
  QuickActionsCard,
  RecentUsersCard,
  TopListingsCard,
  RecentLeadsCard,
} from "@/components/features/admin";

async function getStats() {
  const today = startOfDay(new Date());
  const last7Days = subDays(today, 7);

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
    prisma.user.count(),
    prisma.businessProfile.count({ where: { crVerificationStatus: "PENDING" } }),
    prisma.equipment.count(),
    prisma.equipment.count({ where: { status: "ACTIVE" } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "NEW" } }),

    prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
    prisma.equipment.count({ where: { createdAt: { gte: last7Days } } }),
    prisma.lead.count({ where: { createdAt: { gte: last7Days } } }),

    prisma.user.groupBy({ by: ["country"], _count: { country: true } }),
    prisma.equipment.groupBy({ by: ["locationCountry"], _count: { locationCountry: true } }),
    prisma.lead.findMany({
      select: { equipment: { select: { locationCountry: true } } },
    }),

    prisma.equipment.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.lead.groupBy({ by: ["status"], _count: { status: true } }),

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

  // Extract country-specific stats
  const saUsers = usersByCountry.find((c) => c.country === "SA")?._count.country || 0;
  const bhUsers = usersByCountry.find((c) => c.country === "BH")?._count.country || 0;
  const saEquipment = equipmentByCountry.find((c) => c.locationCountry === "SA")?._count.locationCountry || 0;
  const bhEquipment = equipmentByCountry.find((c) => c.locationCountry === "BH")?._count.locationCountry || 0;

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
    saStats: { users: saUsers, equipment: saEquipment, leads: leadCountryMap["SA"] || 0 },
    bhStats: { users: bhUsers, equipment: bhEquipment, leads: leadCountryMap["BH"] || 0 },
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
        {mainCards.map((card) => (
          <StatsCard key={card.title} {...card} />
        ))}
      </div>

      {/* Analytics Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <CountryDistributionCard
          saStats={stats.saStats}
          bhStats={stats.bhStats}
          totalUsers={stats.totalUsers}
        />

        <StatusDistributionCard
          title="Listing Status"
          description="Equipment by status"
          icon={Package}
          items={stats.equipmentByStatus}
          emptyMessage="No equipment yet"
          getBadgeVariant={(status) =>
            status === "ACTIVE" ? "default" : status === "DRAFT" ? "secondary" : "outline"
          }
        />

        <StatusDistributionCard
          title="Lead Status"
          description="Leads by status"
          icon={Inbox}
          items={stats.leadsByStatus}
          emptyMessage="No leads yet"
          getBadgeVariant={(status) =>
            status === "NEW" || status === "CONVERTED"
              ? "default"
              : status === "CLOSED"
              ? "destructive"
              : "secondary"
          }
          getBadgeClassName={(status) =>
            status === "CONVERTED" ? "bg-green-600" : ""
          }
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <QuickActionsCard
          pendingVerifications={stats.pendingVerifications}
          newLeads={stats.newLeads}
        />
        <RecentUsersCard users={stats.recentUsers} />
      </div>

      {/* Top Performing Listings & Recent Leads */}
      <div className="grid gap-6 md:grid-cols-2">
        <TopListingsCard equipment={stats.topEquipmentByLeads} />
        <RecentLeadsCard leads={stats.recentLeads} />
      </div>
    </div>
  );
}
