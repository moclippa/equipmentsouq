"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCitiesForCountry, getRegionsForCountry } from "./types";

type LocationField = "locationRegion" | "locationCity";

interface EditLocationCardProps {
  locationCountry: string;
  locationRegion: string;
  locationCity: string;
  onCountryChange: (country: string) => void;
  onUpdate: (field: LocationField, value: string) => void;
}

export function EditLocationCard({
  locationCountry,
  locationRegion,
  locationCity,
  onCountryChange,
  onUpdate,
}: EditLocationCardProps) {
  const cities = getCitiesForCountry(locationCountry);
  const regions = getRegionsForCountry(locationCountry);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Country</Label>
            <Select
              value={locationCountry}
              onValueChange={onCountryChange}
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
              value={locationRegion}
              onValueChange={(value) => onUpdate("locationRegion", value)}
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
              value={locationCity}
              onValueChange={(value) => onUpdate("locationCity", value)}
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
  );
}
