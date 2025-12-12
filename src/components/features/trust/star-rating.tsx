/**
 * Star Rating Component
 *
 * Displays star ratings either as read-only display or interactive input.
 * Supports half-stars for average ratings and full stars for user input.
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// DISPLAY COMPONENT (Read-only)
// =============================================================================

interface StarRatingDisplayProps {
  /** Rating value (1-5) */
  rating: number | null;
  /** Maximum stars */
  maxStars?: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show numeric value */
  showValue?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const SIZE_CLASSES = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

const TEXT_SIZES = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export const StarRatingDisplay = memo(function StarRatingDisplay({
  rating,
  maxStars = 5,
  size = "md",
  showValue = false,
  className,
}: StarRatingDisplayProps) {
  if (rating === null || rating === undefined) {
    return (
      <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
        <span className={TEXT_SIZES[size]}>No ratings yet</span>
      </div>
    );
  }

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={cn(SIZE_CLASSES[size], "fill-yellow-400 text-yellow-400")}
          />
        ))}

        {/* Half star */}
        {hasHalfStar && (
          <div className="relative">
            <Star className={cn(SIZE_CLASSES[size], "text-muted-foreground/30")} />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className={cn(SIZE_CLASSES[size], "fill-yellow-400 text-yellow-400")} />
            </div>
          </div>
        )}

        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={cn(SIZE_CLASSES[size], "text-muted-foreground/30")}
          />
        ))}
      </div>

      {showValue && (
        <span className={cn(TEXT_SIZES[size], "font-medium ms-1")}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
});

// =============================================================================
// INPUT COMPONENT (Interactive)
// =============================================================================

interface StarRatingInputProps {
  /** Current value (1-5) */
  value: number | null;
  /** Change handler */
  onChange: (value: number) => void;
  /** Maximum stars */
  maxStars?: number;
  /** Size variant */
  size?: "md" | "lg";
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const StarRatingInput = memo(function StarRatingInput({
  value,
  onChange,
  maxStars = 5,
  size = "lg",
  disabled = false,
  className,
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const handleClick = useCallback(
    (starValue: number) => {
      if (!disabled) {
        onChange(starValue);
      }
    },
    [disabled, onChange]
  );

  const handleMouseEnter = useCallback(
    (starValue: number) => {
      if (!disabled) {
        setHoverValue(starValue);
      }
    },
    [disabled]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverValue(null);
  }, []);

  const displayValue = hoverValue ?? value ?? 0;

  return (
    <div
      className={cn(
        "flex items-center gap-0.5",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: maxStars }).map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= displayValue;

        return (
          <button
            key={starValue}
            type="button"
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            disabled={disabled}
            className={cn(
              "p-0.5 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
              !disabled && "hover:scale-110 cursor-pointer"
            )}
            aria-label={`Rate ${starValue} out of ${maxStars} stars`}
          >
            <Star
              className={cn(
                size === "lg" ? "w-8 h-8" : "w-6 h-6",
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/40 hover:text-yellow-400/60"
              )}
            />
          </button>
        );
      })}
    </div>
  );
});

// =============================================================================
// RATING SUMMARY (with count)
// =============================================================================

interface RatingSummaryProps {
  /** Average rating */
  rating: number | null;
  /** Total review count */
  count: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

export const RatingSummary = memo(function RatingSummary({
  rating,
  count,
  size = "md",
  className,
}: RatingSummaryProps) {
  const countText = count === 1 ? "1 review" : `${count} reviews`;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <StarRatingDisplay rating={rating} size={size} showValue />
      <span className={cn(TEXT_SIZES[size], "text-muted-foreground")}>
        ({countText})
      </span>
    </div>
  );
});
