import { Badge } from "@/components/ui/badge";
import { LeadStatus } from "@prisma/client";
import {
  Eye,
  CheckCircle,
  MessageSquare,
  XCircle,
  Clock,
} from "lucide-react";

export function getStatusBadge(status: LeadStatus) {
  const variants: Record<LeadStatus, { variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Eye; label: string }> = {
    NEW: { variant: "default", icon: Clock, label: "New" },
    VIEWED: { variant: "secondary", icon: Eye, label: "Viewed" },
    CONTACTED: { variant: "outline", icon: MessageSquare, label: "Contacted" },
    CONVERTED: { variant: "default", icon: CheckCircle, label: "Converted" },
    CLOSED: { variant: "destructive", icon: XCircle, label: "Closed" },
  };

  const config = variants[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

export function getInterestBadge(interest: string) {
  switch (interest) {
    case "rent":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Rent</Badge>;
    case "buy":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Buy</Badge>;
    case "both":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Both</Badge>;
    default:
      return <Badge variant="outline">{interest}</Badge>;
  }
}
