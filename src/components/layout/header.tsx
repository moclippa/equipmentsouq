"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import { Heart, Search, Plus } from "lucide-react";

interface HeaderProps {
  variant?: "default" | "marketing";
}

export function Header({ variant = "default" }: HeaderProps) {
  const { data: session, status } = useSession();
  const t = useTranslations("common");
  const tNav = useTranslations("nav");

  const isLoading = status === "loading";
  const isAuthenticated = !!session;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          href={isAuthenticated ? "/dashboard" : "/"}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">E</span>
          </div>
          <span className="font-semibold text-xl hidden sm:inline">{t("appName")}</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/search"
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1"
          >
            <Search className="w-4 h-4" />
            {tNav("search")}
          </Link>

          {isAuthenticated && (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {tNav("dashboard")}
              </Link>
              <Link
                href="/my-listings"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                My Listings
              </Link>
              <Link
                href="/equipment/new"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                List Equipment
              </Link>
            </>
          )}

          {!isAuthenticated && variant === "marketing" && (
            <Link
              href="/how-it-works"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {tNav("howItWorks")}
            </Link>
          )}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          <Link href="/favorites">
            <Button variant="ghost" size="icon" aria-label="Favorites">
              <Heart className="w-4 h-4" />
            </Button>
          </Link>

          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated ? (
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
  );
}
