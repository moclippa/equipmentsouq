import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone } from "lucide-react";
import { format } from "date-fns";

interface RecentLead {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  equipment: {
    titleEn: string;
    owner: { fullName: string };
  };
}

interface RecentLeadsCardProps {
  leads: RecentLead[];
}

export function RecentLeadsCard({ leads }: RecentLeadsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Recent Leads
        </CardTitle>
        <CardDescription>Latest contact requests</CardDescription>
      </CardHeader>
      <CardContent>
        {leads.length > 0 ? (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    interested in {lead.equipment.titleEn}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Owner: {lead.equipment.owner.fullName}
                  </p>
                </div>
                <div className="text-end">
                  <Badge
                    variant={lead.status === "NEW" ? "default" : "secondary"}
                    className="mb-1"
                  >
                    {lead.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {format(lead.createdAt, "MMM d, HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No leads yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
