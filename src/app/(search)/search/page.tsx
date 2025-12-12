"use client";

import { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  SearchFilters,
  SearchHeader,
  EquipmentGrid,
  type EquipmentCardData,
} from "@/components/features/search";

interface Category {
  id: string;
  nameEn: string;
  nameAr: string | null;
  slug: string;
  parentId: string | null;
  iconUrl: string | null;
}

interface SearchResponse {
  equipment: EquipmentCardData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

import { DateRange } from "react-day-picker";

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Search filter state
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [country, setCountry] = useState(searchParams.get("country") || "");
  const [condition, setCondition] = useState(searchParams.get("condition") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [deliveryOnly, setDeliveryOnly] = useState(searchParams.get("delivery") === "true");
  const [instantBookOnly, setInstantBookOnly] = useState(searchParams.get("instant") === "true");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "createdAt");
  const [sortOrder, setSortOrder] = useState(searchParams.get("sortOrder") || "desc");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));

  // Availability filters
  const [showUnavailable, setShowUnavailable] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Display preferences
  const [displayCurrency, setDisplayCurrency] = useState<"SAR" | "BHD">("SAR");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [equipment, setEquipment] = useState<EquipmentCardData[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem("equipmentViewMode");
    if (savedView === "grid" || savedView === "list") {
      setViewMode(savedView);
    }
    const savedCurrency = localStorage.getItem("displayCurrency");
    if (savedCurrency === "SAR" || savedCurrency === "BHD") {
      setDisplayCurrency(savedCurrency);
    }
  }, []);

  // Memoized handlers with page reset
  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value === "all" ? "" : value);
    setPage(1);
  }, []);

  const handleCityChange = useCallback((value: string) => {
    setCity(value === "all" ? "" : value);
    setPage(1);
  }, []);

  const handleCountryChange = useCallback((value: string) => {
    setCountry(value === "all" ? "" : value);
    setCity(""); // Reset city when country changes
    setPage(1);
  }, []);

  const handleConditionChange = useCallback((value: string) => {
    setCondition(value === "all" ? "" : value);
    setPage(1);
  }, []);

  const handleMinPriceChange = useCallback((value: string) => {
    setMinPrice(value);
    setPage(1);
  }, []);

  const handleMaxPriceChange = useCallback((value: string) => {
    setMaxPrice(value);
    setPage(1);
  }, []);

  const handleDeliveryOnlyChange = useCallback((value: boolean) => {
    setDeliveryOnly(value);
    setPage(1);
  }, []);

  const handleInstantBookOnlyChange = useCallback((value: boolean) => {
    setInstantBookOnly(value);
    setPage(1);
  }, []);

  const handleShowUnavailableChange = useCallback((value: boolean) => {
    setShowUnavailable(value);
    setPage(1);
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    setDateRange(range);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: string) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  }, []);

  const handleDisplayCurrencyChange = useCallback((currency: "SAR" | "BHD") => {
    setDisplayCurrency(currency);
    localStorage.setItem("displayCurrency", currency);
  }, []);

  const handleViewModeChange = useCallback((mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("equipmentViewMode", mode);
  }, []);

  const clearFilters = useCallback(() => {
    setCategory("");
    setCity("");
    setCountry("");
    setCondition("");
    setMinPrice("");
    setMaxPrice("");
    setDeliveryOnly(false);
    setInstantBookOnly(false);
    setShowUnavailable(true);
    setDateRange(undefined);
    setPage(1);
  }, []);

  // Memoized check for active filters
  const hasActiveFilters = useMemo(() => {
    return !!(category || city || country || condition || minPrice || maxPrice || deliveryOnly || instantBookOnly || !showUnavailable || dateRange?.from);
  }, [category, city, country, condition, minPrice, maxPrice, deliveryOnly, instantBookOnly, showUnavailable, dateRange]);

  // Memoized search params builder
  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    if (country) params.set("country", country);
    if (condition) params.set("condition", condition);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (deliveryOnly) params.set("delivery", "true");
    if (instantBookOnly) params.set("instant", "true");
    if (sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    if (page > 1) params.set("page", page.toString());
    if (!showUnavailable) params.set("showUnavailable", "false");
    if (dateRange?.from) params.set("availableFrom", dateRange.from.toISOString());
    if (dateRange?.to) params.set("availableTo", dateRange.to.toISOString());
    return params;
  }, [category, city, country, condition, minPrice, maxPrice, deliveryOnly, instantBookOnly, sortBy, sortOrder, page, showUnavailable, dateRange]);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories?parentOnly=true");
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    }
    fetchCategories();
  }, []);

  // Fetch equipment when filters change
  useEffect(() => {
    async function fetchEquipment() {
      setIsLoading(true);
      try {
        const params = buildSearchParams();
        const res = await fetch(`/api/equipment?${params.toString()}`);
        const data: SearchResponse = await res.json();
        setEquipment(data.equipment || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      } catch (error) {
        console.error("Failed to fetch equipment:", error);
        setEquipment([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchEquipment();
  }, [buildSearchParams]);

  // Update URL when filters change (with transition for smooth UX)
  useEffect(() => {
    startTransition(() => {
      const params = buildSearchParams();
      if (query) params.set("q", query);
      const newUrl = params.toString() ? `/search?${params.toString()}` : "/search";
      router.replace(newUrl, { scroll: false });
    });
  }, [buildSearchParams, query, router]);

  // Memoized filter content for mobile sheet
  const filterContent = useMemo(() => (
    <SearchFilters
      categories={categories}
      category={category}
      city={city}
      country={country}
      condition={condition}
      minPrice={minPrice}
      maxPrice={maxPrice}
      deliveryOnly={deliveryOnly}
      instantBookOnly={instantBookOnly}
      showUnavailable={showUnavailable}
      dateRange={dateRange}
      displayCurrency={displayCurrency}
      hasActiveFilters={hasActiveFilters}
      onCategoryChange={handleCategoryChange}
      onCityChange={handleCityChange}
      onCountryChange={handleCountryChange}
      onConditionChange={handleConditionChange}
      onMinPriceChange={handleMinPriceChange}
      onMaxPriceChange={handleMaxPriceChange}
      onDeliveryOnlyChange={handleDeliveryOnlyChange}
      onInstantBookOnlyChange={handleInstantBookOnlyChange}
      onShowUnavailableChange={handleShowUnavailableChange}
      onDateRangeChange={handleDateRangeChange}
      onClearFilters={clearFilters}
    />
  ), [
    categories, category, city, country, condition, minPrice, maxPrice,
    deliveryOnly, instantBookOnly, showUnavailable, dateRange, displayCurrency,
    hasActiveFilters, handleCategoryChange, handleCityChange, handleCountryChange,
    handleConditionChange, handleMinPriceChange, handleMaxPriceChange,
    handleDeliveryOnlyChange, handleInstantBookOnlyChange, handleShowUnavailableChange,
    handleDateRangeChange, clearFilters
  ]);

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <SearchHeader
        query={query}
        sortBy={sortBy}
        sortOrder={sortOrder}
        displayCurrency={displayCurrency}
        viewMode={viewMode}
        total={pagination.total}
        isLoading={isLoading}
        isPending={isPending}
        mobileFiltersOpen={mobileFiltersOpen}
        onQueryChange={setQuery}
        onSortChange={handleSortChange}
        onDisplayCurrencyChange={handleDisplayCurrencyChange}
        onViewModeChange={handleViewModeChange}
        onMobileFiltersOpenChange={setMobileFiltersOpen}
        filterContent={filterContent}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Filters</h3>
                {filterContent}
              </CardContent>
            </Card>
          </aside>

          {/* Equipment Grid */}
          <div className="flex-1">
            <EquipmentGrid
              equipment={equipment}
              pagination={pagination}
              isLoading={isLoading}
              isPending={isPending}
              viewMode={viewMode}
              displayCurrency={displayCurrency}
              hasActiveFilters={hasActiveFilters}
              page={page}
              onPageChange={setPage}
              onClearFilters={clearFilters}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
