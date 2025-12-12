import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface TopEquipment {
  id: string;
  titleEn: string;
  make: string;
  model: string;
  leadCount: number;
  viewCount: number;
  owner: { fullName: string };
}

interface TopListingsCardProps {
  equipment: TopEquipment[];
}

export function TopListingsCard({ equipment }: TopListingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Top Performing Listings
        </CardTitle>
        <CardDescription>Most leads received</CardDescription>
      </CardHeader>
      <CardContent>
        {equipment.length > 0 ? (
          <div className="space-y-3">
            {equipment.map((eq, index) => (
              <Link
                key={eq.id}
                href={`/admin/equipment/${eq.id}`}
                className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium line-clamp-1">{eq.titleEn}</p>
                    <p className="text-xs text-muted-foreground">
                      {eq.make} {eq.model} • {eq.owner.fullName}
                    </p>
                  </div>
                </div>
                <div className="text-end">
                  <p className="text-sm font-medium">{eq.leadCount} leads</p>
                  <p className="text-xs text-muted-foreground">{eq.viewCount} views</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No equipment with leads yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
