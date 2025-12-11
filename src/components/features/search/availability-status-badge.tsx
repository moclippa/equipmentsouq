"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailabilityStatusBadgeProps {
  status: "ACTIVE" | "RENTED" | "SOLD" | "PAUSED" | "DRAFT" | "ARCHIVED";
  hasAvailabilityConflict?: boolean;
  showActiveStatus?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function AvailabilityStatusBadge({
  status,
  hasAvailabilityConflict,
  showActiveStatus = false,
  size = "sm",
  className,
}: AvailabilityStatusBadgeProps) {
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  // If checking specific dates and conflict exists, show warning
  if (hasAvailabilityConflict) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-amber-500 text-amber-600 bg-amber-50",
          className
        )}
      >
        <AlertTriangle className={cn(iconSize, "me-1")} />
        May be unavailable
      </Badge>
    );
  }

  switch (status) {
    case "RENTED":
      return (
        <Badge
          variant="secondary"
          className={cn(
            "bg-amber-100 text-amber-800 border-amber-200",
            className
          )}
        >
          <Clock className={cn(iconSize, "me-1")} />
          Currently Rented
        </Badge>
      );
    case "SOLD":
      return (
        <Badge
          variant="secondary"
          className={cn(
            "bg-gray-100 text-gray-600 border-gray-200",
            className
          )}
        >
          <Tag className={cn(iconSize, "me-1")} />
          Sold
        </Badge>
      );
    case "ACTIVE":
      return showActiveStatus ? (
        <Badge
          variant="secondary"
          className={cn(
            "bg-green-100 text-green-800 border-green-200",
            className
          )}
        >
          <CheckCircle className={cn(iconSize, "me-1")} />
          Available
        </Badge>
      ) : null;
    case "PAUSED":
      return (
        <Badge variant="secondary" className={cn("text-muted-foreground", className)}>
          Paused
        </Badge>
      );
    default:
      return null;
  }
}
