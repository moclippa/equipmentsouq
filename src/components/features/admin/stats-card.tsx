import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  change?: number;
  icon: LucideIcon;
  href: string;
  color: string;
  bgColor: string;
  highlight?: boolean;
}

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  href,
  color,
  bgColor,
  highlight,
}: StatsCardProps) {
  return (
    <Link href={href}>
      <Card className={`hover:shadow-md transition-shadow ${highlight ? "ring-2 ring-amber-400" : ""}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {change !== undefined && change > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-green-600">+{change}</span> last 7 days
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
