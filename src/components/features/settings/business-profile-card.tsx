"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

interface BusinessProfileCardProps {
  className?: string;
}

export function BusinessProfileCard({ className }: BusinessProfileCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Business Profile
        </CardTitle>
        <CardDescription>
          View and manage your business verification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/settings/business">
            View Business Profile
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
