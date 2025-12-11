import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Building2, User, HardHat, Factory, Clock, CheckCircle, XCircle } from "lucide-react";

const BUSINESS_TYPE_ICONS = {
  INDIVIDUAL: User,
  RENTAL_COMPANY: Building2,
  CONTRACTOR: HardHat,
  INDUSTRIAL: Factory,
};

const BUSINESS_TYPE_LABELS = {
  INDIVIDUAL: "Individual Owner",
  RENTAL_COMPANY: "Rental Company",
  CONTRACTOR: "Contractor",
  INDUSTRIAL: "Industrial Company",
};

const STATUS_STYLES = {
  PENDING: { label: "Pending", variant: "secondary" as const, icon: Clock },
  VERIFIED: { label: "Verified", variant: "default" as const, icon: CheckCircle },
  REJECTED: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
  EXPIRED: { label: "Expired", variant: "outline" as const, icon: Clock },
};

async function getVerifications(status?: string) {
  const where = status ? { crVerificationStatus: status as "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED" } : {};

  return prisma.businessProfile.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const verifications = await getVerifications(params.status);

  const counts = {
    all: verifications.length,
    pending: verifications.filter((v) => v.crVerificationStatus === "PENDING").length,
    verified: verifications.filter((v) => v.crVerificationStatus === "VERIFIED").length,
    rejected: verifications.filter((v) => v.crVerificationStatus === "REJECTED").length,
  };

  const filteredVerifications = params.status
    ? verifications.filter((v) => v.crVerificationStatus === params.status)
    : verifications;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business Verifications</h1>
        <p className="text-muted-foreground">
          Review and verify business profiles
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Link href="/admin/verifications">
          <Button variant={!params.status ? "default" : "outline"} size="sm">
            All ({counts.all})
          </Button>
        </Link>
        <Link href="/admin/verifications?status=PENDING">
          <Button variant={params.status === "PENDING" ? "default" : "outline"} size="sm">
            Pending ({counts.pending})
          </Button>
        </Link>
        <Link href="/admin/verifications?status=VERIFIED">
          <Button variant={params.status === "VERIFIED" ? "default" : "outline"} size="sm">
            Verified ({counts.verified})
          </Button>
        </Link>
        <Link href="/admin/verifications?status=REJECTED">
          <Button variant={params.status === "REJECTED" ? "default" : "outline"} size="sm">
            Rejected ({counts.rejected})
          </Button>
        </Link>
      </div>

      {/* Verifications List */}
      {filteredVerifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No verifications found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredVerifications.map((profile) => {
            const Icon = BUSINESS_TYPE_ICONS[profile.businessType];
            const statusConfig = STATUS_STYLES[profile.crVerificationStatus];
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={profile.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{profile.companyNameEn}</h3>
                          <Badge variant={statusConfig.variant}>
                            <StatusIcon className="w-3 h-3 me-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {BUSINESS_TYPE_LABELS[profile.businessType]} • {profile.city}
                        </p>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="text-muted-foreground">Owner:</span>{" "}
                            {profile.user.fullName} ({profile.user.email || profile.user.phone})
                          </p>
                          <p>
                            <span className="text-muted-foreground">CR Number:</span>{" "}
                            {profile.crNumber || "Not provided"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Submitted:</span>{" "}
                            {formatDistanceToNow(profile.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link href={`/admin/verifications/${profile.id}`}>
                      <Button variant="outline" size="sm">
                        Review
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
