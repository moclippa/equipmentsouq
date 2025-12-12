"use client";

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
} from "lucide-react";

interface SearchHeaderProps {
  query: string;
  sortBy: string;
  sortOrder: string;
  displayCurrency: "SAR" | "BHD";
  viewMode: "grid" | "list";
  total: number;
  isLoading: boolean;
  isPending: boolean;
  mobileFiltersOpen: boolean;
  onQueryChange: (query: string) => void;
  onSortChange: (sortBy: string, sortOrder: string) => void;
  onDisplayCurrencyChange: (currency: "SAR" | "BHD") => void;
  onViewModeChange: (mode: "grid" | "list") => void;
  onMobileFiltersOpenChange: (open: boolean) => void;
  filterContent: React.ReactNode;
}

export const SearchHeader = memo(function SearchHeader({
  query,
  sortBy,
  sortOrder,
  displayCurrency,
  viewMode,
  total,
  isLoading,
  isPending,
  mobileFiltersOpen,
  onQueryChange,
  onSortChange,
  onDisplayCurrencyChange,
  onViewModeChange,
  onMobileFiltersOpenChange,
  filterContent,
}: SearchHeaderProps) {
  const handleSortChange = useCallback((value: string) => {
    const [sb, so] = value.split("-");
    onSortChange(sb, so);
  }, [onSortChange]);

  return (
    <div className="border-b bg-card/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2" role="search">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search equipment..."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="ps-10"
              aria-label="Search equipment by name, make, or model"
            />
          </div>
          <Sheet open={mobileFiltersOpen} onOpenChange={onMobileFiltersOpenChange}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden" aria-label="Open filters">
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                {filterContent}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Sort, View Toggle & Results Count */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {isLoading || isPending ? (
              "Loading..."
            ) : (
              <>
                <span className="font-medium text-foreground">{total}</span>{" "}
                equipment found
              </>
            )}
          </p>
          <div className="flex items-center gap-3">
            {/* Currency Toggle */}
            <div role="group" aria-label="Display currency" className="flex items-center rounded-lg border bg-muted p-1">
              <button
                onClick={() => onDisplayCurrencyChange("SAR")}
                aria-pressed={displayCurrency === "SAR"}
                aria-label="Show prices in Saudi Riyal"
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                  displayCurrency === "SAR"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                SAR
              </button>
              <button
                onClick={() => onDisplayCurrencyChange("BHD")}
                aria-pressed={displayCurrency === "BHD"}
                aria-label="Show prices in Bahraini Dinar"
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                  displayCurrency === "BHD"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                BHD
              </button>
            </div>
            {/* View Toggle */}
            <div role="group" aria-label="View mode" className="flex items-center rounded-lg border bg-muted p-1">
              <button
                onClick={() => onViewModeChange("grid")}
                aria-pressed={viewMode === "grid"}
                aria-label="Grid view"
                className={`p-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                  viewMode === "grid"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => onViewModeChange("list")}
                aria-pressed={viewMode === "list"}
                aria-label="List view"
                className={`p-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {/* Sort */}
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest first</SelectItem>
                <SelectItem value="createdAt-asc">Oldest first</SelectItem>
                <SelectItem value="dailyRate-asc">Price: Low to High</SelectItem>
                <SelectItem value="dailyRate-desc">Price: High to Low</SelectItem>
                <SelectItem value="averageRating-desc">Highest rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
});
