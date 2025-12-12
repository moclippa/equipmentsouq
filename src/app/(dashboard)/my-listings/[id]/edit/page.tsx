"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { AvailabilityCalendar } from "@/components/features/listings/availability-calendar";
import {
  EditPhotosCard,
  EditBasicInfoCard,
  EditTitleDescriptionCard,
  EditPricingCard,
  EditLocationCard,
  EditContactCard,
  EquipmentImage,
  EquipmentEditData,
} from "@/components/features/equipment-edit";

export default function EditEquipmentPage() {
  const router = useRouter();
  const params = useParams();
  const equipmentId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<EquipmentEditData | null>(null);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

  useEffect(() => {
    fetchEquipment();
  }, [equipmentId]);

  const fetchEquipment = async () => {
    try {
      const response = await fetch(`/api/equipment/${equipmentId}`);
      if (!response.ok) throw new Error("Failed to fetch equipment");

      const data = await response.json();
      const equipment = data.equipment;
      if (!equipment) throw new Error("Equipment not found");

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

  const updateField = <K extends keyof EquipmentEditData>(
    field: K,
    value: EquipmentEditData[K]
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

  const handleCountryChange = (country: string) => {
    if (!formData) return;
    setFormData({
      ...formData,
      locationCountry: country,
      locationCity: "",
      locationRegion: "",
      currency: country === "SA" ? "SAR" : "BHD",
    });
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

      <EditPhotosCard
        images={formData.images}
        onAddImages={handleAddImages}
        onRemoveImage={handleRemoveImage}
        onSetPrimary={handleSetPrimary}
      />

      <EditBasicInfoCard
        make={formData.make}
        model={formData.model}
        year={formData.year}
        condition={formData.condition}
        hoursUsed={formData.hoursUsed}
        status={formData.status}
        onUpdate={updateField}
      />

      <EditTitleDescriptionCard
        titleEn={formData.titleEn}
        titleAr={formData.titleAr}
        descriptionEn={formData.descriptionEn}
        descriptionAr={formData.descriptionAr}
        onUpdate={updateField}
      />

      <EditPricingCard
        listingType={formData.listingType}
        priceOnRequest={formData.priceOnRequest}
        rentalPrice={formData.rentalPrice}
        rentalPriceUnit={formData.rentalPriceUnit}
        salePrice={formData.salePrice}
        onUpdate={updateField}
      />

      <EditLocationCard
        locationCountry={formData.locationCountry}
        locationRegion={formData.locationRegion}
        locationCity={formData.locationCity}
        onCountryChange={handleCountryChange}
        onUpdate={updateField}
      />

      <EditContactCard
        contactPhone={formData.contactPhone}
        contactWhatsApp={formData.contactWhatsApp}
        onUpdate={updateField}
      />

      {(formData.listingType === "FOR_RENT" || formData.listingType === "BOTH") && (
        <AvailabilityCalendar equipmentId={equipmentId} />
      )}

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
