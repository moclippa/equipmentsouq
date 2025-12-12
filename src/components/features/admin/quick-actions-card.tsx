import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Users, Package, Inbox } from "lucide-react";

interface QuickActionsCardProps {
  pendingVerifications: number;
  newLeads: number;
}

export function QuickActionsCard({
  pendingVerifications,
  newLeads,
}: QuickActionsCardProps) {
  return (
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
          {pendingVerifications > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
              {pendingVerifications} pending
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
          {newLeads > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {newLeads} new
            </span>
          )}
        </Link>
      </CardContent>
    </Card>
  );
}
