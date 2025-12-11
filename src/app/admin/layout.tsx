import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Package,
  Inbox,
  Settings,
  LogOut,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Only allow ADMIN users
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/verifications", label: "Verifications", icon: ShieldCheck },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/equipment", label: "Equipment", icon: Package },
    { href: "/admin/leads", label: "Leads", icon: Inbox },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-e flex flex-col">
        <div className="p-4 border-b">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">E</span>
            </div>
            <div>
              <span className="font-semibold">Equipment Souq</span>
              <span className="text-xs text-muted-foreground block">Admin Panel</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <span className="text-xs font-medium">
                {session.user.fullName?.charAt(0) || "A"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.user.fullName}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
          <LogoutButton className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
            Logout
          </LogoutButton>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-muted/30">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
