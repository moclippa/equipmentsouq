import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserMenu } from "@/components/layout/user-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const t = await getTranslations("nav");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">E</span>
            </div>
            <span className="font-semibold text-xl hidden sm:inline">Equipment Souq</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-sm hover:text-primary">
              {t("dashboard")}
            </Link>
            <Link href="/my-listings" className="text-sm hover:text-primary">
              My Listings
            </Link>
            <Link href="/favorites" className="text-sm hover:text-primary">
              Favorites
            </Link>
            <Link href="/search" className="text-sm hover:text-primary">
              Browse
            </Link>
            <Link href="/equipment/new" className="text-sm text-primary font-medium hover:text-primary/80">
              + List Equipment
            </Link>
          </nav>

          <UserMenu
            user={{
              fullName: session.user.fullName,
              email: session.user.email,
              avatarUrl: undefined,
              role: session.user.role,
            }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
