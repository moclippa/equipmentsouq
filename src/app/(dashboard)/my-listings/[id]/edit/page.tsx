"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Loader2,
  Upload,
  X,
  Star,
  Save,
  Trash2,
} from "lucide-react";
import { AvailabilityCalendar } from "@/components/features/listings/availability-calendar";

interface EquipmentImage {
  id?: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
  file?: File;
  isNew?: boolean;
}

interface EquipmentData {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  make: string;
  model: string;
  year: number | null;
  condition: string;
  hoursUsed: number | null;
  listingType: "FOR_RENT" | "FOR_SALE" | "BOTH";
  rentalPrice: number | null;
  rentalPriceUnit: string;
  salePrice: number | null;
  priceOnRequest: boolean;
  currency: string;
  locationCity: string;
  locationRegion: string;
  locationCountry: string;
  contactPhone: string;
  contactWhatsApp: string | null;
  status: string;
  images: EquipmentImage[];
  category: { id: string; nameEn: string };
}

const CONDITIONS = [
  { value: "EXCELLENT", label: "Excellent" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
];

const SA_CITIES = [
  "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Dhahran",
  "Jubail", "Yanbu", "Tabuk", "Abha", "Khamis Mushait", "Taif", "Hail",
  "Najran", "Jizan", "Al Ahsa", "Qatif", "Hofuf", "Buraidah"
];

const BH_CITIES = [
  "Manama", "Riffa", "Muharraq", "Hamad Town", "Isa Town", "Sitra",
  "Budaiya", "Jidhafs", "Al Hidd"
];

const SA_REGIONS = ["Central", "Western", "Eastern", "Northern", "Southern"];
const BH_REGIONS = ["Capital", "Northern", "Southern", "Muharraq"];

export default function EditEquipmentPage() {
  const router = useRouter();
  const params = useParams();
  const equipmentId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<EquipmentData | null>(null);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

  useEffect(() => {
    fetchEquipment();
  }, [equipmentId]);

  const fetchEquipment = async () => {
    try {
      const response = await fetch(`/api/equipment/${equipmentId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch equipment");
      }
      const data = await response.json();
      // API returns { equipment: ... }
      const equipment = data.equipment;
      if (!equipment) {
        throw new Error("Equipment not found");
      }
      setFormData({
        ...equipment,
        images: equipment.images.map((img: EquipmentImage, index: number) => ({
          ...img,
          sortOrder: img.sortOrder ?? index,
        })),
      });
    } catch (err) {
      setError("Failed to load equipment");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = <K extends keyof EquipmentData>(
    field: K,
    value: EquipmentData[K]
  ) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("category", "equipment");

    const response = await fetch("/api/upload/local", {
      method: "POST",
      body: uploadFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    const data = await response.json();
    return data.url;
  };

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData || !e.target.files) return;

    const files = Array.from(e.target.files);
    const newImages: EquipmentImage[] = [];

    for (const file of files) {
      try {
        const url = await uploadFile(file);
        newImages.push({
          url,
          isPrimary: formData.images.length === 0 && newImages.length === 0,
          sortOrder: formData.images.length + newImages.length,
          isNew: true,
        });
      } catch (err) {
        console.error("Failed to upload image:", err);
        setError("Failed to upload one or more images");
      }
    }

    setFormData({
      ...formData,
      images: [...formData.images, ...newImages],
    });

    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    if (!formData) return;

    const image = formData.images[index];
    if (image.id) {
      setImagesToDelete([...imagesToDelete, image.id]);
    }

    const updatedImages = formData.images.filter((_, i) => i !== index);
    if (updatedImages.length > 0 && !updatedImages.some(img => img.isPrimary)) {
      updatedImages[0].isPrimary = true;
    }
    updatedImages.forEach((img, i) => (img.sortOrder = i));

    setFormData({ ...formData, images: updatedImages });
  };

  const handleSetPrimary = (index: number) => {
    if (!formData) return;

    const updatedImages = formData.images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));

    setFormData({ ...formData, images: updatedImages });
  };

  const handleSave = async () => {
    if (!formData) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/equipment/${equipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleEn: formData.titleEn,
          titleAr: formData.titleAr,
          descriptionEn: formData.descriptionEn,
          descriptionAr: formData.descriptionAr,
          make: formData.make,
          model: formData.model,
          year: formData.year,
          condition: formData.condition,
          hoursUsed: formData.hoursUsed,
          listingType: formData.listingType,
          rentalPrice: formData.rentalPrice,
          rentalPriceUnit: formData.rentalPriceUnit,
          salePrice: formData.salePrice,
          priceOnRequest: formData.priceOnRequest,
          currency: formData.currency,
          locationCity: formData.locationCity,
          locationRegion: formData.locationRegion,
          locationCountry: formData.locationCountry,
          contactPhone: formData.contactPhone,
          contactWhatsApp: formData.contactWhatsApp,
          status: formData.status,
          images: formData.images.map(img => ({
            id: img.id,
            url: img.url,
            isPrimary: img.isPrimary,
            sortOrder: img.sortOrder,
          })),
          imagesToDelete,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/my-listings");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Equipment not found</p>
        <Button asChild className="mt-4">
          <Link href="/my-listings">Back to Listings</Link>
        </Button>
      </div>
    );
  }

  const cities = formData.locationCountry === "SA" ? SA_CITIES : BH_CITIES;
  const regions = formData.locationCountry === "SA" ? SA_REGIONS : BH_REGIONS;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/my-listings">
            <ArrowLeft className="w-4 h-4 me-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Listing</h1>
          <p className="text-muted-foreground">{formData.category.nameEn}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-700">
            Changes saved successfully! Redirecting...
          </AlertDescription>
        </Alert>
      )}

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {formData.images.map((image, index) => {
              const isValidImage = image.url && !image.url.startsWith("blob:");
              return (
                <div key={index} className="relative group aspect-square">
                  <div className="absolute inset-0 rounded-lg overflow-hidden bg-muted">
                    {isValidImage ? (
                      <Image
                        src={image.url}
                        alt={`Photo ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-xs text-center p-2">
                        Invalid image
                      </div>
                    )}
                  </div>
                  {image.isPrimary && (
                    <div className="absolute top-2 start-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                      <Star className="w-3 h-3 inline me-1" />
                      Primary
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    {!image.isPrimary && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSetPrimary(index)}
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Add more button */}
            <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Add Photo</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAddImages}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Make/Brand</Label>
              <Input
                value={formData.make}
                onChange={(e) => updateField("make", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={formData.model}
                onChange={(e) => updateField("model", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                type="number"
                value={formData.year || ""}
                onChange={(e) => updateField("year", e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => updateField("condition", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hours Used</Label>
              <Input
                type="number"
                value={formData.hoursUsed || ""}
                onChange={(e) => updateField("hoursUsed", e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => updateField("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="SOLD">Sold</SelectItem>
                  <SelectItem value="RENTED">Rented</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Title & Description */}
      <Card>
        <CardHeader>
          <CardTitle>Title & Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title (English)</Label>
            <Input
              value={formData.titleEn}
              onChange={(e) => updateField("titleEn", e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Title (Arabic)</Label>
            <Input
              dir="rtl"
              value={formData.titleAr}
              onChange={(e) => updateField("titleAr", e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Description (English)</Label>
            <Textarea
              value={formData.descriptionEn}
              onChange={(e) => updateField("descriptionEn", e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Description (Arabic)</Label>
            <Textarea
              dir="rtl"
              value={formData.descriptionAr}
              onChange={(e) => updateField("descriptionAr", e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Listing Type</Label>
            <Select
              value={formData.listingType}
              onValueChange={(value) => updateField("listingType", value as "FOR_RENT" | "FOR_SALE" | "BOTH")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FOR_RENT">For Rent</SelectItem>
                <SelectItem value="FOR_SALE">For Sale</SelectItem>
                <SelectItem value="BOTH">Both Rent & Sale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="priceOnRequest"
              checked={formData.priceOnRequest}
              onCheckedChange={(checked) => updateField("priceOnRequest", !!checked)}
            />
            <Label htmlFor="priceOnRequest" className="cursor-pointer">
              Contact for price
            </Label>
          </div>

          {!formData.priceOnRequest && (
            <div className="grid gap-4 sm:grid-cols-2">
              {(formData.listingType === "FOR_RENT" || formData.listingType === "BOTH") && (
                <div className="space-y-2">
                  <Label>Rental Price</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.rentalPrice || ""}
                      onChange={(e) => updateField("rentalPrice", e.target.value ? parseFloat(e.target.value) : null)}
                      className="flex-1"
                    />
                    <Select
                      value={formData.rentalPriceUnit}
                      onValueChange={(value) => updateField("rentalPriceUnit", value)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">/day</SelectItem>
                        <SelectItem value="week">/week</SelectItem>
                        <SelectItem value="month">/month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {(formData.listingType === "FOR_SALE" || formData.listingType === "BOTH") && (
                <div className="space-y-2">
                  <Label>Sale Price</Label>
                  <Input
                    type="number"
                    value={formData.salePrice || ""}
                    onChange={(e) => updateField("salePrice", e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={formData.locationCountry}
                onValueChange={(value) => {
                  updateField("locationCountry", value);
                  updateField("locationCity", "");
                  updateField("locationRegion", "");
                  updateField("currency", value === "SA" ? "SAR" : "BHD");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SA">Saudi Arabia</SelectItem>
                  <SelectItem value="BH">Bahrain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select
                value={formData.locationRegion}
                onValueChange={(value) => updateField("locationRegion", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Select
                value={formData.locationCity}
                onValueChange={(value) => updateField("locationCity", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={formData.contactPhone}
                onChange={(e) => updateField("contactPhone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp (optional)</Label>
              <Input
                value={formData.contactWhatsApp || ""}
                onChange={(e) => updateField("contactWhatsApp", e.target.value || null)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Availability Calendar - Only show for rental listings */}
      {(formData.listingType === "FOR_RENT" || formData.listingType === "BOTH") && (
        <AvailabilityCalendar equipmentId={equipmentId} />
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" asChild>
          <Link href="/my-listings">Cancel</Link>
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 me-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
