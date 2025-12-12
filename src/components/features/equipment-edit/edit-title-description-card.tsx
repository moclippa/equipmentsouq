"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TitleDescriptionField = "titleEn" | "titleAr" | "descriptionEn" | "descriptionAr";

interface EditTitleDescriptionCardProps {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  onUpdate: (field: TitleDescriptionField, value: string) => void;
}

export function EditTitleDescriptionCard({
  titleEn,
  titleAr,
  descriptionEn,
  descriptionAr,
  onUpdate,
}: EditTitleDescriptionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title & Description</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title (English)</Label>
          <Input
            value={titleEn}
            onChange={(e) => onUpdate("titleEn", e.target.value)}
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label>Title (Arabic)</Label>
          <Input
            dir="rtl"
            value={titleAr}
            onChange={(e) => onUpdate("titleAr", e.target.value)}
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label>Description (English)</Label>
          <Textarea
            value={descriptionEn}
            onChange={(e) => onUpdate("descriptionEn", e.target.value)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label>Description (Arabic)</Label>
          <Textarea
            dir="rtl"
            value={descriptionAr}
            onChange={(e) => onUpdate("descriptionAr", e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}
