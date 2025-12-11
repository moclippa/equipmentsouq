import { auth } from "@/lib/auth";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import { Heart, Search } from "lucide-react";

export default async function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const t = await getTranslations("common");
  const tNav = await getTranslations("nav");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">E</span>
            </div>
            <span className="font-semibold text-xl hidden sm:inline">{t("appName")}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/search" className="text-sm hover:text-primary flex items-center gap-1">
              <Search className="w-4 h-4" />
              {tNav("search")}
            </Link>
            {session && (
              <>
                <Link href="/dashboard" className="text-sm hover:text-primary">
                  {tNav("dashboard")}
                </Link>
                <Link href="/my-listings" className="text-sm hover:text-primary">
                  My Listings
                </Link>
                <Link href="/equipment/new" className="text-sm text-primary font-medium hover:text-primary/80">
                  + List Equipment
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/favorites" title="Favorites">
              <Button variant="ghost" size="icon">
                <Heart className="w-4 h-4" />
              </Button>
            </Link>

            {session ? (
              <UserMenu
                user={{
                  fullName: session.user.fullName,
                  email: session.user.email,
                  avatarUrl: undefined,
                  role: session.user.role,
                }}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    {tNav("login")}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    {tNav("register")}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
