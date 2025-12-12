import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Package, Shield } from "lucide-react";

interface UserStatsCardProps {
  equipmentCount: number;
  notificationsCount: number;
}

export function UserStatsCard({ equipmentCount, notificationsCount }: UserStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Equipment Listings</span>
          </div>
          <span className="font-bold">{equipmentCount}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Notifications</span>
          </div>
          <span className="font-bold">{notificationsCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}
