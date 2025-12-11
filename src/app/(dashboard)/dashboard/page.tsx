import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Eye, MessageCircle, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const t = await getTranslations("nav");

  // Fetch user's dashboard stats
  const userId = session?.user?.id;

  const [activeListings, totalViews, totalLeads] = await Promise.all([
    // Count user's active equipment
    prisma.equipment.count({
      where: {
        ownerId: userId,
        status: "ACTIVE",
      },
    }),
    // Sum total views on user's equipment
    prisma.equipment.aggregate({
      where: { ownerId: userId },
      _sum: { viewCount: true },
    }),
    // Count leads on user's equipment
    prisma.lead.count({
      where: {
        equipment: { ownerId: userId },
      },
    }),
  ]);

  const views = totalViews._sum.viewCount || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("dashboard")}</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session?.user.fullName}!
        </p>
      </div>

      {/* Quick Actions - shown first on mobile */}
      <Card className="md:hidden">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with EquipmentSouq
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link
            href="/equipment/new"
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div>
              <h3 className="font-medium">List Equipment</h3>
              <p className="text-sm text-muted-foreground">
                Start earning by listing your equipment
              </p>
            </div>
            <span className="text-sm text-primary">
              Get Started &rarr;
            </span>
          </Link>
          <Link
            href="/search"
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div>
              <h3 className="font-medium">Browse Equipment</h3>
              <p className="text-sm text-muted-foreground">
                Find equipment for your project
              </p>
            </div>
            <span className="text-sm text-primary">
              Search &rarr;
            </span>
          </Link>
          <Link
            href="/settings/business"
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div>
              <h3 className="font-medium">Complete Profile</h3>
              <p className="text-sm text-muted-foreground">
                Add business details to get verified
              </p>
            </div>
            <span className="text-sm text-primary">
              Setup &rarr;
            </span>
          </Link>
        </CardContent>
      </Card>

      {/* Your Listings - mobile only */}
      <Card className="md:hidden">
        <CardHeader>
          <CardTitle>Your Listings</CardTitle>
          <CardDescription>
            Manage your equipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeListings > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You have {activeListings} active listing{activeListings !== 1 ? "s" : ""}.
              </p>
              <Link
                href="/my-listings"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                View all listings &rarr;
              </Link>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No listings yet</p>
              <Link
                href="/equipment/new"
                className="inline-flex items-center mt-2 text-sm text-primary hover:underline"
              >
                Create your first listing &rarr;
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Active Listings</CardDescription>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeListings}</div>
            <p className="text-xs text-muted-foreground">
              {activeListings === 0 ? "No equipment listed yet" : "Equipment available"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Total Views</CardDescription>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{views}</div>
            <p className="text-xs text-muted-foreground">
              On your listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Leads</CardDescription>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              {totalLeads === 0 ? "No inquiries yet" : "People interested"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Conversion Rate</CardDescription>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {views > 0 ? ((totalLeads / views) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Views to leads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Desktop layout - Quick Actions shown here */}
      <div className="hidden md:grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with EquipmentSouq
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/equipment/new"
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div>
                <h3 className="font-medium">List Equipment</h3>
                <p className="text-sm text-muted-foreground">
                  Start earning by listing your equipment
                </p>
              </div>
              <span className="text-sm text-primary">
                Get Started &rarr;
              </span>
            </Link>
            <Link
              href="/search"
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div>
                <h3 className="font-medium">Browse Equipment</h3>
                <p className="text-sm text-muted-foreground">
                  Find equipment for your project
                </p>
              </div>
              <span className="text-sm text-primary">
                Search &rarr;
              </span>
            </Link>
            <Link
              href="/settings/business"
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div>
                <h3 className="font-medium">Complete Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Add business details to get verified
                </p>
              </div>
              <span className="text-sm text-primary">
                Setup &rarr;
              </span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Listings</CardTitle>
            <CardDescription>
              Manage your equipment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeListings > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You have {activeListings} active listing{activeListings !== 1 ? "s" : ""}.
                </p>
                <Link
                  href="/my-listings"
                  className="inline-flex items-center text-sm text-primary hover:underline"
                >
                  View all listings &rarr;
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No listings yet</p>
                <Link
                  href="/equipment/new"
                  className="inline-flex items-center mt-2 text-sm text-primary hover:underline"
                >
                  Create your first listing &rarr;
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
