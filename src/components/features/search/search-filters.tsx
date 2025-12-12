"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { AvailabilityFilter } from "./availability-filter";

interface Category {
  id: string;
  nameEn: string;
  nameAr: string | null;
  slug: string;
  parentId: string | null;
  iconUrl: string | null;
}

const SAUDI_CITIES = [
  "Riyadh", "Jeddah", "Makkah", "Madinah", "Dammam", "Khobar", "Dhahran",
  "Jubail", "Yanbu", "Tabuk", "Abha", "Najran", "Jizan", "Hail",
];

const BAHRAIN_CITIES = [
  "Manama", "Riffa", "Muharraq", "Hamad Town", "Isa Town", "Sitra",
];

const CONDITIONS = [
  { value: "EXCELLENT", label: "Excellent" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
];

interface SearchFiltersProps {
  categories: Category[];
  category: string;
  city: string;
  country: string;
  condition: string;
  minPrice: string;
  maxPrice: string;
  deliveryOnly: boolean;
  instantBookOnly: boolean;
  showUnavailable: boolean;
  dateRange: DateRange | undefined;
  displayCurrency: "SAR" | "BHD";
  hasActiveFilters: boolean;
  onCategoryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onConditionChange: (value: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onDeliveryOnlyChange: (value: boolean) => void;
  onInstantBookOnlyChange: (value: boolean) => void;
  onShowUnavailableChange: (value: boolean) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onClearFilters: () => void;
}

export const SearchFilters = memo(function SearchFilters({
  categories,
  category,
  city,
  country,
  condition,
  minPrice,
  maxPrice,
  deliveryOnly,
  instantBookOnly,
  showUnavailable,
  dateRange,
  displayCurrency,
  hasActiveFilters,
  onCategoryChange,
  onCityChange,
  onCountryChange,
  onConditionChange,
  onMinPriceChange,
  onMaxPriceChange,
  onDeliveryOnlyChange,
  onInstantBookOnlyChange,
  onShowUnavailableChange,
  onDateRangeChange,
  onClearFilters,
}: SearchFiltersProps) {
  const cities = country === "BH" ? BAHRAIN_CITIES : SAUDI_CITIES;

  return (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <label id="filter-category-label" className="text-sm font-medium mb-2 block">Category</label>
        <Select value={category || "all"} onValueChange={onCategoryChange}>
          <SelectTrigger aria-labelledby="filter-category-label">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location */}
      <div>
        <label id="filter-country-label" className="text-sm font-medium mb-2 block">Country</label>
        <Select value={country || "all"} onValueChange={onCountryChange}>
          <SelectTrigger aria-labelledby="filter-country-label">
            <SelectValue placeholder="All countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            <SelectItem value="SA">Saudi Arabia</SelectItem>
            <SelectItem value="BH">Bahrain</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label id="filter-city-label" className="text-sm font-medium mb-2 block">City</label>
        <Select value={city || "all"} onValueChange={onCityChange}>
          <SelectTrigger aria-labelledby="filter-city-label">
            <SelectValue placeholder="All cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Condition */}
      <div>
        <label id="filter-condition-label" className="text-sm font-medium mb-2 block">Condition</label>
        <Select value={condition || "all"} onValueChange={onConditionChange}>
          <SelectTrigger aria-labelledby="filter-condition-label">
            <SelectValue placeholder="Any condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any condition</SelectItem>
            {CONDITIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <fieldset>
        <legend className="text-sm font-medium mb-2 block">Price Range ({displayCurrency})</legend>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
            className="w-1/2"
            aria-label={`Minimum price in ${displayCurrency}`}
          />
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            className="w-1/2"
            aria-label={`Maximum price in ${displayCurrency}`}
          />
        </div>
      </fieldset>

      <Separator />

      {/* Availability Filters */}
      <div>
        <span id="filter-availability-label" className="text-sm font-medium mb-3 block">Availability</span>
        <AvailabilityFilter
          showUnavailable={showUnavailable}
          onShowUnavailableChange={onShowUnavailableChange}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
        />
      </div>

      <Separator />

      {/* Quick Filters */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium block">Options</legend>
        <div className="flex items-center gap-2">
          <Checkbox
            id="delivery"
            checked={deliveryOnly}
            onCheckedChange={(checked) => onDeliveryOnlyChange(checked === true)}
          />
          <label htmlFor="delivery" className="text-sm cursor-pointer">
            Delivery available
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="instant"
            checked={instantBookOnly}
            onCheckedChange={(checked) => onInstantBookOnlyChange(checked === true)}
          />
          <label htmlFor="instant" className="text-sm cursor-pointer">
            Instant book
          </label>
        </div>
      </fieldset>

      {hasActiveFilters && (
        <>
          <Separator />
          <Button variant="outline" className="w-full" onClick={onClearFilters}>
            <X className="w-4 h-4 me-2" />
            Clear all filters
          </Button>
        </>
      )}
    </div>
  );
});
