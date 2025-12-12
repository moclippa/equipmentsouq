import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { BusinessProfile } from "@prisma/client";

interface UserBusinessCardProps {
  businessProfile: BusinessProfile;
}

export function UserBusinessCard({ businessProfile }: UserBusinessCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Business Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-muted-foreground">Company Name</p>
          <p className="font-medium">{businessProfile.companyNameEn}</p>
          {businessProfile.companyNameAr && (
            <p className="text-muted-foreground" dir="rtl">
              {businessProfile.companyNameAr}
            </p>
          )}
        </div>
        <Separator />
        <div>
          <p className="text-muted-foreground">Business Type</p>
          <p className="font-medium">{businessProfile.businessType}</p>
        </div>
        <Separator />
        <div>
          <p className="text-muted-foreground">CR Verification</p>
          <Badge
            variant={
              businessProfile.crVerificationStatus === "VERIFIED"
                ? "default"
                : businessProfile.crVerificationStatus === "REJECTED"
                ? "destructive"
                : "secondary"
            }
          >
            {businessProfile.crVerificationStatus}
          </Badge>
        </div>
        <Separator />
        <div>
          <p className="text-muted-foreground">Location</p>
          <p className="font-medium">
            {businessProfile.city}, {businessProfile.region}
          </p>
        </div>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/admin/verifications/${businessProfile.id}`}>
            View Full Profile
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
