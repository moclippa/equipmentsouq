import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { LeadStatus } from "@prisma/client";
import { StatusCount } from "./types";

interface StatusCardConfig {
  status: LeadStatus;
  label: string;
  count: number;
  color: string;
}

interface LeadsStatusCardsProps {
  counts: StatusCount;
  activeStatus?: string;
}

export function LeadsStatusCards({ counts, activeStatus }: LeadsStatusCardsProps) {
  const statusCards: StatusCardConfig[] = [
    { status: "NEW", label: "New Leads", count: counts.NEW || 0, color: "text-blue-600" },
    { status: "VIEWED", label: "Viewed", count: counts.VIEWED || 0, color: "text-gray-600" },
    { status: "CONTACTED", label: "Contacted", count: counts.CONTACTED || 0, color: "text-amber-600" },
    { status: "CONVERTED", label: "Converted", count: counts.CONVERTED || 0, color: "text-green-600" },
    { status: "CLOSED", label: "Closed", count: counts.CLOSED || 0, color: "text-red-600" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {statusCards.map((card) => (
        <Link
          key={card.status}
          href={`/admin/leads?status=${card.status}`}
        >
          <Card className={`hover:shadow-md transition-shadow ${activeStatus === card.status ? "ring-2 ring-primary" : ""}`}>
            <CardHeader className="pb-2">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className={`text-2xl ${card.color}`}>
                {card.count}
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
