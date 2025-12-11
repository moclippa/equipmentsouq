"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, ArrowLeft } from "lucide-react";
import type { EquipmentFormData } from "@/app/(dashboard)/equipment/new/page";

interface Category {
  id: string;
  nameEn: string;
  nameAr: string | null;
  slug: string;
  parentId: string | null;
  children?: Category[];
}

interface CategoryStepProps {
  formData: EquipmentFormData;
  updateFormData: (data: Partial<EquipmentFormData>) => void;
  onNext: () => void;
}

export function CategoryStep({ formData, updateFormData, onNext }: CategoryStepProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get parent categories
  const parentCategories = categories.filter((c) => !c.parentId);

  // Get children of selected parent
  const childCategories = selectedParent
    ? categories.filter((c) => c.parentId === selectedParent.id)
    : [];

  // Filter by search
  const filteredCategories = search
    ? categories.filter(
        (c) =>
          c.nameEn.toLowerCase().includes(search.toLowerCase()) ||
          c.nameAr?.includes(search)
      )
    : selectedParent
    ? childCategories
    : parentCategories;

  const handleSelectCategory = (category: Category) => {
    // If it's a parent with children, drill down
    const hasChildren = categories.some((c) => c.parentId === category.id);
    if (hasChildren && !category.parentId) {
      setSelectedParent(category);
      return;
    }

    // Select this category
    updateFormData({
      categoryId: category.id,
      categoryName: category.nameEn,
    });
  };

  const handleBack = () => {
    setSelectedParent(null);
  };

  const canProceed = !!formData.categoryId;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">What type of equipment?</h2>
        <p className="text-muted-foreground">
          Select the category that best describes your equipment
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search categories..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value) setSelectedParent(null);
          }}
          className="ps-10"
        />
      </div>

      {/* Breadcrumb */}
      {selectedParent && !search && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 me-1" />
            All Categories
          </Button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{selectedParent.nameEn}</span>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filteredCategories.map((category) => {
          const hasChildren = categories.some((c) => c.parentId === category.id);
          const isSelected = formData.categoryId === category.id;

          return (
            <Card
              key={category.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleSelectCategory(category)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{category.nameEn}</p>
                  {category.nameAr && (
                    <p className="text-sm text-muted-foreground" dir="rtl">
                      {category.nameAr}
                    </p>
                  )}
                </div>
                {hasChildren && !category.parentId ? (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                ) : isSelected ? (
                  <Badge>Selected</Badge>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No categories found matching &ldquo;{search}&rdquo;
        </div>
      )}

      {/* Selected Category Display */}
      {formData.categoryId && (
        <div className="bg-muted rounded-lg p-4">
          <Label className="text-sm text-muted-foreground">Selected Category</Label>
          <p className="font-medium">{formData.categoryName}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onNext} disabled={!canProceed}>
          Continue
          <ChevronRight className="w-4 h-4 ms-1" />
        </Button>
      </div>
    </div>
  );
}
