import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import {
  getOrSetCached,
  CACHE_TTL,
  CACHE_KEYS,
  CachedStats,
  CachedFeaturedEquipment,
} from "@/lib/cache";
import { Header } from "@/components/layout/header";
import {
  HeroSection,
  TrustIndicators,
  CategoriesSection,
  FeaturedEquipmentSection,
  RecentTransactions,
  HowItWorksSection,
  StatsSection,
  ForOwnersSection,
  CTASection,
  HomepageFooter,
} from "@/components/features/homepage";

async function getStats(): Promise<CachedStats> {
  return getOrSetCached<CachedStats>(
    CACHE_KEYS.STATS,
    CACHE_TTL.STATS,
    async () => {
      const [equipmentCount, ownerCount, leadCount] = await Promise.all([
        prisma.equipment.count({ where: { status: "ACTIVE" } }),
        prisma.user.count({ where: { role: "OWNER" } }),
        prisma.lead.count(),
      ]);

      return {
        equipment: equipmentCount || 0,
        owners: ownerCount || 0,
        leads: leadCount || 0,
      };
    }
  );
}

async function getFeaturedEquipment(): Promise<CachedFeaturedEquipment[]> {
  return getOrSetCached<CachedFeaturedEquipment[]>(
    CACHE_KEYS.FEATURED_EQUIPMENT,
    CACHE_TTL.FEATURED_EQUIPMENT,
    async () => {
      const equipment = await prisma.equipment.findMany({
        where: { status: "ACTIVE" },
        take: 4,
        orderBy: { viewCount: "desc" },
        include: {
          category: { select: { nameEn: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
      });

      return equipment.map((eq) => ({
        id: eq.id,
        titleEn: eq.titleEn,
        titleAr: eq.titleAr,
        make: eq.make,
        model: eq.model,
        year: eq.year,
        viewCount: eq.viewCount,
        rentalPrice: eq.rentalPrice ? Number(eq.rentalPrice) : null,
        rentalPriceUnit: eq.rentalPriceUnit,
        currency: eq.currency,
        locationCity: eq.locationCity,
        category: eq.category,
        images: eq.images,
      }));
    }
  );
}

interface CachedRecentTransaction {
  id: string;
  titleEn: string;
  titleAr: string | null;
  make: string | null;
  model: string | null;
  status: string;
  statusChangedAt: string | null;
  updatedAt: string;
  locationCity: string | null;
  category: { nameEn: string; nameAr: string; slug: string };
  images: { url: string }[];
}

async function getRecentTransactions(): Promise<CachedRecentTransaction[]> {
  return getOrSetCached<CachedRecentTransaction[]>(
    CACHE_KEYS.RECENT_TRANSACTIONS,
    CACHE_TTL.RECENT_TRANSACTIONS,
    async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const transactions = await prisma.equipment.findMany({
        where: {
          status: { in: ["RENTED", "SOLD"] },
          OR: [
            { statusChangedAt: { gte: thirtyDaysAgo } },
            { statusChangedAt: null, updatedAt: { gte: thirtyDaysAgo } },
          ],
        },
        orderBy: [{ statusChangedAt: "desc" }, { updatedAt: "desc" }],
        take: 8,
        include: {
          category: { select: { nameEn: true, nameAr: true, slug: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
      });

      return transactions.map((eq) => ({
        id: eq.id,
        titleEn: eq.titleEn,
        titleAr: eq.titleAr,
        make: eq.make,
        model: eq.model,
        status: eq.status,
        statusChangedAt: eq.statusChangedAt?.toISOString() || null,
        updatedAt: eq.updatedAt.toISOString(),
        locationCity: eq.locationCity,
        category: eq.category,
        images: eq.images,
      }));
    }
  );
}

export default async function Home() {
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  const t = await getTranslations("common");

  const [stats, featuredEquipment, recentTransactions] = await Promise.all([
    getStats(),
    getFeaturedEquipment(),
    getRecentTransactions(),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="marketing" />

      <main id="main-content" className="flex-1">
        <HeroSection />
        <TrustIndicators />
        <CategoriesSection />
        <FeaturedEquipmentSection equipment={featuredEquipment} />

        {recentTransactions.length > 0 && (
          <RecentTransactions
            equipment={recentTransactions.map((eq) => ({
              id: eq.id,
              titleEn: eq.titleEn,
              titleAr: eq.titleAr,
              make: eq.make,
              model: eq.model,
              status: eq.status as "RENTED" | "SOLD",
              statusChangedAt: eq.statusChangedAt,
              updatedAt: eq.updatedAt,
              category: eq.category,
              images: eq.images,
              locationCity: eq.locationCity,
            }))}
          />
        )}

        <HowItWorksSection />
        <StatsSection stats={stats} />
        <ForOwnersSection />
        <CTASection />
      </main>

      <HomepageFooter appName={t("appName")} />
    </div>
  );
}
