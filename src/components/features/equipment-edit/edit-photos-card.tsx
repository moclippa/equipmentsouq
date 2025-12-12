"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Star } from "lucide-react";
import { EquipmentImage } from "./types";

interface EditPhotosCardProps {
  images: EquipmentImage[];
  onAddImages: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onSetPrimary: (index: number) => void;
}

export function EditPhotosCard({
  images,
  onAddImages,
  onRemoveImage,
  onSetPrimary,
}: EditPhotosCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => {
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
                      onClick={() => onSetPrimary(index)}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onRemoveImage(index)}
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
              onChange={onAddImages}
            />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
