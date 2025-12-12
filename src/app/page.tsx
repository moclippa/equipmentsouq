import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { RecentTransactions } from "@/components/features/homepage/recent-transactions";
import {
  Construction,
  ArrowUpFromLine,
  Package,
  Cog,
  MoveVertical,
  Zap,
  Truck,
  Search,
  Phone,
  MessageCircle,
  Shield,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Star,
} from "lucide-react";

async function getStats() {
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

async function getFeaturedEquipment() {
  return prisma.equipment.findMany({
    where: { status: "ACTIVE" },
    take: 4,
    orderBy: { viewCount: "desc" },
    include: {
      category: { select: { nameEn: true } },
      images: { where: { isPrimary: true }, take: 1 },
    },
  });
}

async function getRecentTransactions() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return prisma.equipment.findMany({
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

  const categories = [
    { name: "Excavators", nameAr: "حفارات", icon: Construction, color: "bg-amber-100 text-amber-600", slug: "excavators" },
    { name: "Cranes", nameAr: "رافعات", icon: ArrowUpFromLine, color: "bg-blue-100 text-blue-600", slug: "cranes" },
    { name: "Loaders", nameAr: "لوادر", icon: Package, color: "bg-green-100 text-green-600", slug: "loaders" },
    { name: "Bulldozers", nameAr: "بلدوزرات", icon: Cog, color: "bg-orange-100 text-orange-600", slug: "bulldozers" },
    { name: "Forklifts", nameAr: "رافعات شوكية", icon: MoveVertical, color: "bg-purple-100 text-purple-600", slug: "forklifts" },
    { name: "Generators", nameAr: "مولدات", icon: Zap, color: "bg-yellow-100 text-yellow-600", slug: "generators" },
    { name: "Dump Trucks", nameAr: "شاحنات قلابة", icon: Truck, color: "bg-red-100 text-red-600", slug: "dump-trucks" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="marketing" />

      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-28 px-4 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />

          <div className="container mx-auto relative">
            <div className="text-center max-w-4xl mx-auto">
              <Badge variant="secondary" className="mb-4">
                🇸🇦 Saudi Arabia & 🇧🇭 Bahrain
              </Badge>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Find & Rent Heavy Equipment{" "}
                <span className="text-primary">Directly from Owners</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                The largest classifieds platform for construction equipment in the Gulf.
                Browse listings, contact owners directly, and negotiate your best deal.
              </p>

              {/* Search Bar */}
              <div className="max-w-2xl mx-auto mb-8">
                <Link href="/search">
                  <div className="flex items-center gap-3 p-4 bg-background border rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                    <Search className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground flex-1 text-start">
                      Search for excavators, cranes, loaders...
                    </span>
                    <Button size="sm">
                      Search
                    </Button>
                  </div>
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/search">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    Browse Equipment
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    List Your Equipment Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-8 px-4 border-y bg-muted/30">
          <div className="container mx-auto">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">Free to List</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">Verified Owners</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium">Direct Contact</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">WhatsApp Support</span>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Browse by Category
              </h2>
              <p className="text-muted-foreground">
                Find the right equipment for your project
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={`/search?category=${category.slug}`}
                  className="flex flex-col items-center p-6 bg-background rounded-xl border hover:border-primary hover:shadow-md transition-all group"
                >
                  <div className={`w-14 h-14 ${category.color} rounded-full mb-3 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <category.icon className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-medium text-center">
                    {category.name}
                  </span>
                </Link>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link href="/search">
                <Button variant="outline" className="gap-2">
                  View All Categories
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Equipment */}
        {featuredEquipment.length > 0 && (
          <section className="py-16 px-4 bg-muted/30">
            <div className="container mx-auto">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    Featured Equipment
                  </h2>
                  <p className="text-muted-foreground">
                    Popular listings from verified owners
                  </p>
                </div>
                <Link href="/search" className="hidden md:block">
                  <Button variant="outline" className="gap-2">
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredEquipment.map((equipment) => (
                  <Link key={equipment.id} href={`/equipment/${equipment.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                      <div className="aspect-[4/3] bg-muted relative">
                        {equipment.images[0] ? (
                          <img
                            src={equipment.images[0].url}
                            alt={equipment.titleEn}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <Badge className="absolute top-3 start-3" variant="secondary">
                          {equipment.category.nameEn}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold line-clamp-1 mb-1">
                          {equipment.titleEn}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {equipment.make} {equipment.model} {equipment.year}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {equipment.locationCity}
                          </div>
                          {equipment.rentalPrice && (
                            <span className="font-semibold text-primary">
                              {equipment.currency} {Number(equipment.rentalPrice).toLocaleString()}/{equipment.rentalPriceUnit}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              <div className="text-center mt-8 md:hidden">
                <Link href="/search">
                  <Button variant="outline" className="gap-2">
                    View All Equipment
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Just Sold & Rented Section */}
        {recentTransactions.length > 0 && (
          <RecentTransactions
            equipment={recentTransactions.map((eq) => ({
              id: eq.id,
              titleEn: eq.titleEn,
              titleAr: eq.titleAr,
              make: eq.make,
              model: eq.model,
              status: eq.status as "RENTED" | "SOLD",
              statusChangedAt: eq.statusChangedAt?.toISOString() || null,
              updatedAt: eq.updatedAt.toISOString(),
              category: eq.category,
              images: eq.images,
              locationCity: eq.locationCity,
            }))}
          />
        )}

        {/* How It Works */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                How EquipmentSouq Works
              </h2>
              <p className="text-muted-foreground">
                Simple, direct, no middleman fees
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">1. Search & Find</h3>
                <p className="text-muted-foreground">
                  Browse hundreds of equipment listings. Filter by category, location, and price to find what you need.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">2. Contact Owner</h3>
                <p className="text-muted-foreground">
                  Click &quot;Contact Owner&quot; to get their phone number and WhatsApp. Reach out directly to discuss details.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">3. Negotiate & Deal</h3>
                <p className="text-muted-foreground">
                  Discuss pricing, availability, and delivery directly with the owner. Make your deal on your terms.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 bg-primary text-primary-foreground">
          <div className="container mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                The Gulf&apos;s Largest Equipment Marketplace
              </h2>
              <p className="opacity-90">
                Trusted by contractors across Saudi Arabia and Bahrain
              </p>
            </div>

            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold mb-2">
                  {stats.equipment > 0 ? stats.equipment : "500"}+
                </div>
                <div className="text-sm opacity-90">Equipment Listed</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold mb-2">
                  {stats.owners > 0 ? stats.owners : "200"}+
                </div>
                <div className="text-sm opacity-90">Verified Owners</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold mb-2">
                  {stats.leads > 0 ? stats.leads : "1000"}+
                </div>
                <div className="text-sm opacity-90">Connections Made</div>
              </div>
            </div>
          </div>
        </section>

        {/* For Owners Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
              <div>
                <Badge variant="outline" className="mb-4">For Equipment Owners</Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  List Your Equipment for Free
                </h2>
                <p className="text-muted-foreground mb-6">
                  Reach thousands of contractors looking to rent or buy equipment.
                  No listing fees, no commissions - just direct business.
                </p>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <span>Free unlimited listings</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <span>AI-powered listing creation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <span>SMS notifications for new leads</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <span>Direct contact - no middleman</span>
                  </li>
                </ul>

                <Link href="/register">
                  <Button size="lg" className="gap-2">
                    Start Listing Free
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <div className="bg-muted/50 rounded-2xl p-8 border">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-background rounded-lg">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">List in 2 Minutes</div>
                      <div className="text-sm text-muted-foreground">AI helps write your listing</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-background rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">Get Notified</div>
                      <div className="text-sm text-muted-foreground">SMS alerts for every inquiry</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-background rounded-lg">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">Build Reputation</div>
                      <div className="text-sm text-muted-foreground">Verified badge for trusted owners</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto text-center max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Join EquipmentSouq today - it&apos;s free for both renters and owners.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Create Free Account
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/search">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Browse Equipment
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 px-4 bg-background">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">E</span>
                </div>
                <span className="font-semibold text-xl">{t("appName")}</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                The Gulf&apos;s largest classifieds platform for heavy equipment rental and sale.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">For Renters</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/search" className="hover:text-primary transition-colors">Browse Equipment</Link></li>
                <li><Link href="/how-it-works" className="hover:text-primary transition-colors">How It Works</Link></li>
                <li><Link href="/register" className="hover:text-primary transition-colors">Create Account</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">For Owners</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/register" className="hover:text-primary transition-colors">List Equipment</Link></li>
                <li><Link href="/how-it-works" className="hover:text-primary transition-colors">Owner Guide</Link></li>
                <li><Link href="/login" className="hover:text-primary transition-colors">Manage Listings</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} EquipmentSouq. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>🇸🇦 Saudi Arabia</span>
              <span>•</span>
              <span>🇧🇭 Bahrain</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
