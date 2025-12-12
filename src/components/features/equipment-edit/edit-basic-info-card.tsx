"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONDITIONS } from "./types";

type BasicInfoField = "make" | "model" | "year" | "condition" | "hoursUsed" | "status";

interface EditBasicInfoCardProps {
  make: string;
  model: string;
  year: number | null;
  condition: string;
  hoursUsed: number | null;
  status: string;
  onUpdate: (field: BasicInfoField, value: string | number | null) => void;
}

export function EditBasicInfoCard({
  make,
  model,
  year,
  condition,
  hoursUsed,
  status,
  onUpdate,
}: EditBasicInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Make/Brand</Label>
            <Input
              value={make}
              onChange={(e) => onUpdate("make", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Input
              value={model}
              onChange={(e) => onUpdate("model", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Input
              type="number"
              value={year || ""}
              onChange={(e) => onUpdate("year", e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select
              value={condition}
              onValueChange={(value) => onUpdate("condition", value)}
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
              value={hoursUsed || ""}
              onChange={(e) => onUpdate("hoursUsed", e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) => onUpdate("status", value)}
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
  );
}
