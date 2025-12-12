import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface StatusItem {
  status: string;
  _count: { status: number };
}

interface StatusDistributionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  items: StatusItem[];
  emptyMessage: string;
  getBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  getBadgeClassName?: (status: string) => string;
}

export function StatusDistributionCard({
  title,
  description,
  icon: Icon,
  items,
  emptyMessage,
  getBadgeVariant,
  getBadgeClassName,
}: StatusDistributionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.status} className="flex items-center justify-between">
              <Badge
                variant={getBadgeVariant(item.status)}
                className={getBadgeClassName?.(item.status)}
              >
                {item.status}
              </Badge>
              <span className="font-medium">{item._count.status}</span>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {emptyMessage}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
