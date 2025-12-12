/**
 * Trust Badge Component
 *
 * Displays individual trust badges with icons and tooltips.
 * Supports both compact (icon only) and expanded (with label) modes.
 */

"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ShieldCheck,
  BadgeCheck,
  Clock,
  Star,
  Sparkles,
} from "lucide-react";
import type { TrustBadge as TrustBadgeType } from "@prisma/client";
import { BADGE_DEFINITIONS } from "@/types/trust";

// =============================================================================
// ICON MAPPING
// =============================================================================

const BADGE_ICONS: Record<TrustBadgeType, React.ComponentType<{ className?: string }>> = {
  VERIFIED_BUSINESS: ShieldCheck,
  VERIFIED_IDENTITY: BadgeCheck,
  FAST_RESPONDER: Clock,
  RELIABLE: ShieldCheck,
  TOP_RATED: Star,
  FEATURED_SELLER: Sparkles,
};

const BADGE_COLORS: Record<TrustBadgeType, string> = {
  VERIFIED_BUSINESS: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  VERIFIED_IDENTITY: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  FAST_RESPONDER: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  RELIABLE: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  TOP_RATED: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  FEATURED_SELLER: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
};

// =============================================================================
// TYPES
// =============================================================================

interface TrustBadgeProps {
  badge: TrustBadgeType;
  /** Show label alongside icon */
  showLabel?: boolean;
  /** Use compact sizing */
  compact?: boolean;
  /** Current language for labels */
  lang?: "en" | "ar";
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TrustBadge = memo(function TrustBadge({
  badge,
  showLabel = false,
  compact = false,
  lang = "en",
}: TrustBadgeProps) {
  const definition = BADGE_DEFINITIONS[badge];
  const Icon = BADGE_ICONS[badge];
  const colorClass = BADGE_COLORS[badge];

  const label = lang === "ar" ? definition.labelAr : definition.labelEn;
  const description = lang === "ar" ? definition.descriptionAr : definition.descriptionEn;

  const iconSize = compact ? "w-3 h-3" : "w-3.5 h-3.5";
  const badgeSize = compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={`${colorClass} ${badgeSize} cursor-help hover:opacity-80 transition-opacity`}
        >
          <Icon className={`${iconSize} ${showLabel ? "me-1" : ""}`} />
          {showLabel && <span>{label}</span>}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" side="top">
        <div className="flex items-start gap-2">
          <div className={`p-1.5 rounded-md ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

// =============================================================================
// BADGE STACK - Multiple badges in a row
// =============================================================================

interface TrustBadgeStackProps {
  badges: TrustBadgeType[];
  /** Maximum badges to show before +N */
  maxVisible?: number;
  /** Show labels on badges */
  showLabels?: boolean;
  /** Compact mode for tight spaces */
  compact?: boolean;
  /** Language */
  lang?: "en" | "ar";
}

export const TrustBadgeStack = memo(function TrustBadgeStack({
  badges,
  maxVisible = 3,
  showLabels = false,
  compact = false,
  lang = "en",
}: TrustBadgeStackProps) {
  if (!badges || badges.length === 0) return null;

  const visibleBadges = badges.slice(0, maxVisible);
  const hiddenCount = badges.length - maxVisible;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visibleBadges.map((badge) => (
        <TrustBadge
          key={badge}
          badge={badge}
          showLabel={showLabels}
          compact={compact}
          lang={lang}
        />
      ))}
      {hiddenCount > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge
              variant="outline"
              className={`${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"} cursor-pointer`}
            >
              +{hiddenCount}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <div className="flex flex-col gap-1">
              {badges.slice(maxVisible).map((badge) => (
                <TrustBadge
                  key={badge}
                  badge={badge}
                  showLabel
                  compact={compact}
                  lang={lang}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
});
