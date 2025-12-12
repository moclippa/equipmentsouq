"use client";

import { useState, useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DateRange } from "react-day-picker";

export interface SearchFilters {
  query: string;
  category: string;
  city: string;
  country: string;
  condition: string;
  minPrice: string;
  maxPrice: string;
  deliveryOnly: boolean;
  instantBookOnly: boolean;
  sortBy: string;
  sortOrder: string;
  page: number;
  showUnavailable: boolean;
  dateRange: DateRange | undefined;
}

export interface UseSearchFiltersReturn {
  filters: SearchFilters;
  isPending: boolean;
  displayCurrency: "SAR" | "BHD";
  viewMode: "grid" | "list";
  hasActiveFilters: boolean;
  setQuery: (query: string) => void;
  setCategory: (category: string) => void;
  setCity: (city: string) => void;
  setCountry: (country: string) => void;
  setCondition: (condition: string) => void;
  setMinPrice: (price: string) => void;
  setMaxPrice: (price: string) => void;
  setDeliveryOnly: (value: boolean) => void;
  setInstantBookOnly: (value: boolean) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (sortOrder: string) => void;
  setPage: (page: number) => void;
  setShowUnavailable: (value: boolean) => void;
  setDateRange: (range: DateRange | undefined) => void;
  setDisplayCurrency: (currency: "SAR" | "BHD") => void;
  setViewMode: (mode: "grid" | "list") => void;
  clearFilters: () => void;
  buildSearchParams: () => URLSearchParams;
}

export function useSearchFilters(): UseSearchFiltersReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Initialize state from URL params
  const [query, setQueryState] = useState(searchParams.get("q") || "");
  const [category, setCategoryState] = useState(searchParams.get("category") || "");
  const [city, setCityState] = useState(searchParams.get("city") || "");
  const [country, setCountryState] = useState(searchParams.get("country") || "");
  const [condition, setConditionState] = useState(searchParams.get("condition") || "");
  const [minPrice, setMinPriceState] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPriceState] = useState(searchParams.get("maxPrice") || "");
  const [deliveryOnly, setDeliveryOnlyState] = useState(searchParams.get("delivery") === "true");
  const [instantBookOnly, setInstantBookOnlyState] = useState(searchParams.get("instant") === "true");
  const [sortBy, setSortByState] = useState(searchParams.get("sortBy") || "createdAt");
  const [sortOrder, setSortOrderState] = useState(searchParams.get("sortOrder") || "desc");
  const [page, setPageState] = useState(parseInt(searchParams.get("page") || "1"));
  const [showUnavailable, setShowUnavailableState] = useState(true);
  const [dateRange, setDateRangeState] = useState<DateRange | undefined>();

  // Display preferences (not filter state)
  const [displayCurrency, setDisplayCurrencyState] = useState<"SAR" | "BHD">("SAR");
  const [viewMode, setViewModeState] = useState<"grid" | "list">("grid");

  // Build search params for API call
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

  // Update URL with transition for smoother UX
  const updateURL = useCallback((params: URLSearchParams, q: string) => {
    startTransition(() => {
      if (q) params.set("q", q);
      const newUrl = params.toString() ? `/search?${params.toString()}` : "/search";
      router.replace(newUrl, { scroll: false });
    });
  }, [router]);

  // Wrapped setters that reset page and update URL
  const setQuery = useCallback((value: string) => {
    setQueryState(value);
  }, []);

  const setCategory = useCallback((value: string) => {
    setCategoryState(value === "all" ? "" : value);
    setPageState(1);
  }, []);

  const setCity = useCallback((value: string) => {
    setCityState(value === "all" ? "" : value);
    setPageState(1);
  }, []);

  const setCountry = useCallback((value: string) => {
    setCountryState(value === "all" ? "" : value);
    setCityState(""); // Reset city when country changes
    setPageState(1);
  }, []);

  const setCondition = useCallback((value: string) => {
    setConditionState(value === "all" ? "" : value);
    setPageState(1);
  }, []);

  const setMinPrice = useCallback((value: string) => {
    setMinPriceState(value);
    setPageState(1);
  }, []);

  const setMaxPrice = useCallback((value: string) => {
    setMaxPriceState(value);
    setPageState(1);
  }, []);

  const setDeliveryOnly = useCallback((value: boolean) => {
    setDeliveryOnlyState(value);
    setPageState(1);
  }, []);

  const setInstantBookOnly = useCallback((value: boolean) => {
    setInstantBookOnlyState(value);
    setPageState(1);
  }, []);

  const setSortBy = useCallback((value: string) => {
    setSortByState(value);
    setPageState(1);
  }, []);

  const setSortOrder = useCallback((value: string) => {
    setSortOrderState(value);
    setPageState(1);
  }, []);

  const setPage = useCallback((value: number) => {
    setPageState(value);
  }, []);

  const setShowUnavailable = useCallback((value: boolean) => {
    setShowUnavailableState(value);
    setPageState(1);
  }, []);

  const setDateRange = useCallback((range: DateRange | undefined) => {
    setDateRangeState(range);
    setPageState(1);
  }, []);

  const setDisplayCurrency = useCallback((currency: "SAR" | "BHD") => {
    setDisplayCurrencyState(currency);
    if (typeof window !== "undefined") {
      localStorage.setItem("displayCurrency", currency);
    }
  }, []);

  const setViewMode = useCallback((mode: "grid" | "list") => {
    setViewModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("equipmentViewMode", mode);
    }
  }, []);

  const clearFilters = useCallback(() => {
    setCategoryState("");
    setCityState("");
    setCountryState("");
    setConditionState("");
    setMinPriceState("");
    setMaxPriceState("");
    setDeliveryOnlyState(false);
    setInstantBookOnlyState(false);
    setShowUnavailableState(true);
    setDateRangeState(undefined);
    setPageState(1);
  }, []);

  // Memoized filters object
  const filters = useMemo<SearchFilters>(() => ({
    query,
    category,
    city,
    country,
    condition,
    minPrice,
    maxPrice,
    deliveryOnly,
    instantBookOnly,
    sortBy,
    sortOrder,
    page,
    showUnavailable,
    dateRange,
  }), [query, category, city, country, condition, minPrice, maxPrice, deliveryOnly, instantBookOnly, sortBy, sortOrder, page, showUnavailable, dateRange]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(category || city || country || condition || minPrice || maxPrice || deliveryOnly || instantBookOnly || !showUnavailable || dateRange?.from);
  }, [category, city, country, condition, minPrice, maxPrice, deliveryOnly, instantBookOnly, showUnavailable, dateRange]);

  return {
    filters,
    isPending,
    displayCurrency,
    viewMode,
    hasActiveFilters,
    setQuery,
    setCategory,
    setCity,
    setCountry,
    setCondition,
    setMinPrice,
    setMaxPrice,
    setDeliveryOnly,
    setInstantBookOnly,
    setSortBy,
    setSortOrder,
    setPage,
    setShowUnavailable,
    setDateRange,
    setDisplayCurrency,
    setViewMode,
    clearFilters,
    buildSearchParams,
  };
}
