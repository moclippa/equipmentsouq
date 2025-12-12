"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield } from "lucide-react";
import { EquipmentOwner } from "@/types/equipment";

interface OwnerInfoCardProps {
  owner: EquipmentOwner;
}

export function OwnerInfoCard({ owner }: OwnerInfoCardProps) {
  const memberSince = new Date(owner.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Listed by</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={owner.avatarUrl || undefined} />
            <AvatarFallback>{owner.fullName?.[0]?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {owner.businessProfile?.companyNameEn || owner.fullName || "Owner"}
            </p>
            <p className="text-sm text-muted-foreground">Member since {memberSince}</p>
          </div>
        </div>

        {owner.businessProfile?.crVerificationStatus === "VERIFIED" && (
          <Badge variant="secondary" className="w-full justify-center py-1">
            <Shield className="w-3 h-3 me-1" />
            Verified Business
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
