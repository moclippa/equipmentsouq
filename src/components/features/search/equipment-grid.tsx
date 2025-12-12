"use client";

import { memo, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { EquipmentGridCard, EquipmentListCard, type EquipmentCardData } from "./equipment-card";

// Currency conversion rates (approximate)
const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  SAR: { SAR: 1, BHD: 0.0999 },
  BHD: { BHD: 1, SAR: 10.01 },
};

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface EquipmentGridProps {
  equipment: EquipmentCardData[];
  pagination: Pagination;
  isLoading: boolean;
  isPending: boolean;
  viewMode: "grid" | "list";
  displayCurrency: "SAR" | "BHD";
  hasActiveFilters: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
}

export const EquipmentGrid = memo(function EquipmentGrid({
  equipment,
  pagination,
  isLoading,
  isPending,
  viewMode,
  displayCurrency,
  hasActiveFilters,
  page,
  onPageChange,
  onClearFilters,
}: EquipmentGridProps) {
  // Memoized price formatter
  const formatPrice = useCallback((amount: string, originalCurrency: string) => {
    let convertedAmount = parseFloat(amount);

    // Convert if needed
    if (originalCurrency !== displayCurrency) {
      const rate = EXCHANGE_RATES[originalCurrency]?.[displayCurrency] || 1;
      convertedAmount = convertedAmount * rate;
    }

    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency: displayCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(convertedAmount);
  }, [displayCurrency]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Loading equipment...</span>
      </div>
    );
  }

  // Empty state
  if (equipment.length === 0) {
    return (
      <div className="text-center py-20">
        <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">No equipment found</h3>
        <p className="text-muted-foreground mb-4">
          Try adjusting your search or filters
        </p>
        {hasActiveFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={isPending ? "opacity-60 transition-opacity" : ""}>
      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((item) => (
            <EquipmentGridCard
              key={item.id}
              equipment={item}
              formatPrice={formatPrice}
            />
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="flex flex-col gap-3">
          {equipment.map((item) => (
            <EquipmentListCard
              key={item.id}
              equipment={item}
              formatPrice={formatPrice}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <nav aria-label="Search results pagination" className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="icon"
            disabled={page === 1 || isPending}
            onClick={() => onPageChange(page - 1)}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm" aria-current="page">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page === pagination.totalPages || isPending}
            onClick={() => onPageChange(page + 1)}
            aria-label="Go to next page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </nav>
      )}
    </div>
  );
});
