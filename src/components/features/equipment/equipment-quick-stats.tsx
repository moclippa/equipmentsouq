"use client";

import { Calendar, Clock, MapPin, Tag } from "lucide-react";
import { CONDITION_LABELS, EquipmentCondition } from "@/types/equipment";

interface EquipmentQuickStatsProps {
  year: number | null;
  hoursUsed: number | null;
  locationCity: string;
  condition: EquipmentCondition;
}

export function EquipmentQuickStats({
  year,
  hoursUsed,
  locationCity,
  condition,
}: EquipmentQuickStatsProps) {
  const conditionInfo = CONDITION_LABELS[condition] || {
    label: condition,
    color: "bg-gray-500",
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="text-center p-3 bg-muted rounded-lg">
        <Calendar className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Year</p>
        <p className="font-medium">{year || "N/A"}</p>
      </div>
      <div className="text-center p-3 bg-muted rounded-lg">
        <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Hours</p>
        <p className="font-medium">{hoursUsed?.toLocaleString() || "N/A"}</p>
      </div>
      <div className="text-center p-3 bg-muted rounded-lg">
        <MapPin className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Location</p>
        <p className="font-medium">{locationCity}</p>
      </div>
      <div className="text-center p-3 bg-muted rounded-lg">
        <Tag className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Condition</p>
        <p className="font-medium">{conditionInfo.label}</p>
      </div>
    </div>
  );
}
