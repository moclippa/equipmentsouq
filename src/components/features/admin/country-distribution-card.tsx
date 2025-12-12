import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users, Package, Inbox } from "lucide-react";

interface CountryStats {
  users: number;
  equipment: number;
  leads: number;
}

interface CountryDistributionCardProps {
  saStats: CountryStats;
  bhStats: CountryStats;
  totalUsers: number;
}

export function CountryDistributionCard({
  saStats,
  bhStats,
  totalUsers,
}: CountryDistributionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          By Country
        </CardTitle>
        <CardDescription>Distribution across markets</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CountryRow
          flag="🇸🇦"
          name="Saudi Arabia"
          stats={saStats}
          totalUsers={totalUsers}
          barColor="bg-green-600"
        />
        <CountryRow
          flag="🇧🇭"
          name="Bahrain"
          stats={bhStats}
          totalUsers={totalUsers}
          barColor="bg-red-600"
        />
      </CardContent>
    </Card>
  );
}

function CountryRow({
  flag,
  name,
  stats,
  totalUsers,
  barColor,
}: {
  flag: string;
  name: string;
  stats: CountryStats;
  totalUsers: number;
  barColor: string;
}) {
  const percentage = totalUsers > 0 ? (stats.users / totalUsers) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">{flag} {name}</span>
        <div className="flex items-center gap-4 text-sm">
          <span><Users className="w-3 h-3 inline me-1" />{stats.users}</span>
          <span><Package className="w-3 h-3 inline me-1" />{stats.equipment}</span>
          <span><Inbox className="w-3 h-3 inline me-1" />{stats.leads}</span>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`${barColor} h-2 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
