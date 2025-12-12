"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ContactField = "contactPhone" | "contactWhatsApp";

interface EditContactCardProps {
  contactPhone: string;
  contactWhatsApp: string | null;
  onUpdate: (field: ContactField, value: string | null) => void;
}

export function EditContactCard({
  contactPhone,
  contactWhatsApp,
  onUpdate,
}: EditContactCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={contactPhone}
              onChange={(e) => onUpdate("contactPhone", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp (optional)</Label>
            <Input
              value={contactWhatsApp || ""}
              onChange={(e) => onUpdate("contactWhatsApp", e.target.value || null)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
