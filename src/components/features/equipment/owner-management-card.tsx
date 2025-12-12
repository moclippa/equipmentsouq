"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, BarChart3, Pencil } from "lucide-react";

interface OwnerManagementCardProps {
  equipmentId: string;
  viewCount: number;
  leadCount: number;
}

export function OwnerManagementCard({
  equipmentId,
  viewCount,
  leadCount,
}: OwnerManagementCardProps) {
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Your Listing
          </Badge>
        </div>
        <CardTitle className="text-lg">Manage Listing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Listing Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-background rounded-lg border">
            <Eye className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{viewCount}</p>
            <p className="text-xs text-muted-foreground">Views</p>
          </div>
          <div className="text-center p-3 bg-background rounded-lg border">
            <BarChart3 className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{leadCount}</p>
            <p className="text-xs text-muted-foreground">Leads</p>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button asChild className="w-full">
            <Link href={`/my-listings/${equipmentId}/edit`}>
              <Pencil className="w-4 h-4 me-2" />
              Edit Listing
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/my-leads">View All Leads</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
