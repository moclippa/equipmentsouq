"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Home,
  Heart,
  LayoutGrid,
  List,
} from "lucide-react";

interface Category {
  id: string;
  nameEn: string;
  nameAr: string | null;
  slug: string;
  parentId: string | null;
  iconUrl: string | null;
}

interface Equipment {
  id: string;
  titleEn: string;
  titleAr: string | null;
  make: string;
  model: string;
  year: number | null;
  condition: string;
  listingType: "FOR_RENT" | "FOR_SALE" | "BOTH";
  rentalPrice: string | null;
  rentalPriceUnit: string | null;
  salePrice: string | null;
  priceOnRequest: boolean;
  currency: string;
  locationCity: string;
  locationRegion: string;
  locationCountry: string;
  category: {
    id: string;
    nameEn: string;
    nameAr: string | null;
    slug: string;
  };
  owner: {
    id: string;
    fullName: string | null;
  };
  images: Array<{
    url: string;
    isPrimary: boolean;
  }>;
  _count: {
    leads: number;
  };
}

interface SearchResponse {
  equipment: Equipment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

// Currency conversion rates (approximate)
const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  SAR: { SAR: 1, BHD: 0.0999 },
  BHD: { BHD: 1, SAR: 10.01 },
};

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search state
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [country, setCountry] = useState(searchParams.get("country") || "");
  const [condition, setCondition] = useState(searchParams.get("condition") || "");
  const [displayCurrency, setDisplayCurrency] = useState<"SAR" | "BHD">("SAR");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [deliveryOnly, setDeliveryOnly] = useState(searchParams.get("delivery") === "true");
  const [instantBookOnly, setInstantBookOnly] = useState(searchParams.get("instant") === "true");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "createdAt");
  const [sortOrder, setSortOrder] = useState(searchParams.get("sortOrder") || "desc");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));

  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Load preferences from localStorage
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

  // Save view preference to localStorage
  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("equipmentViewMode", mode);
  };

  // Save currency preference to localStorage
  const handleDisplayCurrencyChange = (currency: "SAR" | "BHD") => {
    setDisplayCurrency(currency);
    localStorage.setItem("displayCurrency", currency);
  };

  // Fetch categories
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

  // Build search params (displayCurrency is NOT a filter, just display preference)
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
    return params;
  }, [category, city, country, condition, minPrice, maxPrice, deliveryOnly, instantBookOnly, sortBy, sortOrder, page]);

  // Fetch equipment
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

  // Update URL when filters change
  useEffect(() => {
    const params = buildSearchParams();
    if (query) params.set("q", query);
    const newUrl = params.toString() ? `/search?${params.toString()}` : "/search";
    router.replace(newUrl, { scroll: false });
  }, [buildSearchParams, query, router]);

  const clearFilters = () => {
    setCategory("");
    setCity("");
    setCountry("");
    setCondition("");
    setMinPrice("");
    setMaxPrice("");
    setDeliveryOnly(false);
    setInstantBookOnly(false);
    setPage(1);
  };

  const hasActiveFilters = category || city || country || condition || minPrice || maxPrice || deliveryOnly || instantBookOnly;

  const cities = country === "BH" ? BAHRAIN_CITIES : SAUDI_CITIES;

  // Convert and format price to display currency
  const formatPrice = (amount: string, originalCurrency: string) => {
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
      maximumFractionDigits: displayCurrency === "BHD" ? 0 : 0,
    }).format(convertedAmount);
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <label className="text-sm font-medium mb-2 block">Category</label>
        <Select value={category || "all"} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger>
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
        <label className="text-sm font-medium mb-2 block">Country</label>
        <Select value={country || "all"} onValueChange={(v) => { setCountry(v === "all" ? "" : v); setCity(""); setPage(1); }}>
          <SelectTrigger>
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
        <label className="text-sm font-medium mb-2 block">City</label>
        <Select value={city || "all"} onValueChange={(v) => { setCity(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger>
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
        <label className="text-sm font-medium mb-2 block">Condition</label>
        <Select value={condition || "all"} onValueChange={(v) => { setCondition(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger>
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
      <div>
        <label className="text-sm font-medium mb-2 block">Price Range ({displayCurrency})</label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
            className="w-1/2"
          />
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
            className="w-1/2"
          />
        </div>
      </div>

      <Separator />

      {/* Quick Filters */}
      <div className="space-y-3">
        <label className="text-sm font-medium block">Options</label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="delivery"
            checked={deliveryOnly}
            onCheckedChange={(checked) => { setDeliveryOnly(checked === true); setPage(1); }}
          />
          <label htmlFor="delivery" className="text-sm cursor-pointer">
            Delivery available
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="instant"
            checked={instantBookOnly}
            onCheckedChange={(checked) => { setInstantBookOnly(checked === true); setPage(1); }}
          />
          <label htmlFor="instant" className="text-sm cursor-pointer">
            Instant book
          </label>
        </div>
      </div>

      {hasActiveFilters && (
        <>
          <Separator />
          <Button variant="outline" className="w-full" onClick={clearFilters}>
            <X className="w-4 h-4 me-2" />
            Clear all filters
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">E</span>
            </div>
            <span className="font-semibold text-lg">Equipment Souq</span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Currency Display Toggle (converts prices, doesn't filter) */}
            <div className="flex items-center rounded-lg border bg-muted p-1">
              <button
                onClick={() => handleDisplayCurrencyChange("SAR")}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  displayCurrency === "SAR"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                SAR
              </button>
              <button
                onClick={() => handleDisplayCurrencyChange("BHD")}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  displayCurrency === "BHD"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                BHD
              </button>
            </div>
            <Link href="/favorites">
              <Button variant="ghost" size="icon" title="My Favorites">
                <Heart className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="w-4 h-4 me-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Search Header */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ps-10"
              />
            </div>
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Sort, View Toggle & Results Count */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                "Loading..."
              ) : (
                <>
                  <span className="font-medium text-foreground">{pagination.total}</span>{" "}
                  equipment found
                </>
              )}
            </p>
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center rounded-lg border bg-muted p-1">
                <button
                  onClick={() => handleViewModeChange("grid")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange("list")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              {/* Sort */}
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(v) => {
                  const [sb, so] = v.split("-");
                  setSortBy(sb);
                  setSortOrder(so);
                  setPage(1);
                }}
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Filters</h3>
                <FilterContent />
              </CardContent>
            </Card>
          </aside>

          {/* Equipment Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : equipment.length === 0 ? (
              <div className="text-center py-20">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No equipment found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filters
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Grid View */}
                {viewMode === "grid" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {equipment.map((item) => (
                      <Link key={item.id} href={`/equipment/${item.id}`}>
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
                          {/* Image */}
                          <div className="relative aspect-[4/3] bg-muted">
                            {item.images[0] ? (
                              <Image
                                src={item.images[0].url}
                                alt={item.titleEn}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                No image
                              </div>
                            )}

                            {/* Badges */}
                            <div className="absolute top-2 start-2 flex flex-col gap-1">
                              {item.listingType === "FOR_SALE" && (
                                <Badge className="bg-green-600 text-white">
                                  For Sale
                                </Badge>
                              )}
                              {item.listingType === "BOTH" && (
                                <Badge variant="secondary">
                                  Rent or Buy
                                </Badge>
                              )}
                            </div>

                            {/* Price */}
                            <div className="absolute bottom-2 end-2">
                              {item.priceOnRequest ? (
                                <Badge variant="secondary" className="text-sm font-medium px-2 py-1">
                                  Contact for price
                                </Badge>
                              ) : item.rentalPrice ? (
                                <Badge variant="secondary" className="text-base font-bold px-2 py-1">
                                  {formatPrice(item.rentalPrice, item.currency)}/{item.rentalPriceUnit || "day"}
                                </Badge>
                              ) : item.salePrice ? (
                                <Badge variant="secondary" className="text-base font-bold px-2 py-1">
                                  {formatPrice(item.salePrice, item.currency)}
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          {/* Content */}
                          <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground mb-1">
                              {item.category.nameEn}
                            </div>
                            <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                              {item.titleEn}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {item.make} {item.model} {item.year && `(${item.year})`}
                            </p>

                            <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                              <span className="flex items-center">
                                <MapPin className="w-3 h-3 me-1" />
                                {item.locationCity}
                              </span>
                              <span className="text-xs">
                                {item.condition}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}

                {/* List View */}
                {viewMode === "list" && (
                  <div className="flex flex-col gap-3">
                    {equipment.map((item) => (
                      <Link key={item.id} href={`/equipment/${item.id}`}>
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
                          <div className="flex">
                            {/* Image */}
                            <div className="relative w-48 sm:w-56 shrink-0 bg-muted">
                              {item.images[0] ? (
                                <Image
                                  src={item.images[0].url}
                                  alt={item.titleEn}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full min-h-[120px] flex items-center justify-center text-muted-foreground">
                                  No image
                                </div>
                              )}
                              {/* Listing Type Badge */}
                              <div className="absolute top-2 start-2">
                                {item.listingType === "FOR_SALE" && (
                                  <Badge className="bg-green-600 text-white">
                                    For Sale
                                  </Badge>
                                )}
                                {item.listingType === "BOTH" && (
                                  <Badge variant="secondary">
                                    Rent or Buy
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Content */}
                            <CardContent className="flex-1 p-4 flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-muted-foreground mb-1">
                                      {item.category.nameEn}
                                    </div>
                                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                                      {item.titleEn}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      {item.make} {item.model} {item.year && `(${item.year})`}
                                    </p>
                                  </div>
                                  {/* Price */}
                                  <div className="shrink-0 text-end">
                                    {item.priceOnRequest ? (
                                      <span className="text-sm font-medium text-muted-foreground">
                                        Contact for price
                                      </span>
                                    ) : item.rentalPrice ? (
                                      <div>
                                        <span className="text-lg font-bold text-primary">
                                          {formatPrice(item.rentalPrice, item.currency)}
                                        </span>
                                        <span className="text-sm text-muted-foreground">/{item.rentalPriceUnit || "day"}</span>
                                      </div>
                                    ) : item.salePrice ? (
                                      <span className="text-lg font-bold text-primary">
                                        {formatPrice(item.salePrice, item.currency)}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              {/* Footer info */}
                              <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-muted-foreground">
                                <span className="flex items-center">
                                  <MapPin className="w-3 h-3 me-1" />
                                  {item.locationCity}, {item.locationCountry}
                                </span>
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="text-xs">
                                    {item.condition}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">
                      Page {page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={page === pagination.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
