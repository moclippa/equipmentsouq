import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  FileText,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

const businessTypeLabels: Record<string, string> = {
  INDIVIDUAL: "Individual Owner",
  RENTAL_COMPANY: "Rental Company",
  CONTRACTOR: "Contractor",
  INDUSTRIAL: "Industrial Company",
};

const verificationStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: "Pending Review", variant: "secondary", icon: Clock },
  VERIFIED: { label: "Verified", variant: "default", icon: CheckCircle },
  REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
  EXPIRED: { label: "Expired", variant: "outline", icon: AlertCircle },
};

export default async function BusinessSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch business profile
  const profile = await prisma.businessProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      businessType: true,
      companyNameEn: true,
      companyNameAr: true,
      crNumber: true,
      vatNumber: true,
      city: true,
      region: true,
      addressLine1: true,
      country: true,
      crVerificationStatus: true,
      vatVerificationStatus: true,
      rejectionReason: true,
      verifiedAt: true,
      createdAt: true,
    },
  });

  // If no profile exists, redirect to onboarding
  if (!profile) {
    redirect("/onboarding");
  }

  const crStatus = verificationStatusConfig[profile.crVerificationStatus] || verificationStatusConfig.PENDING;
  const CrStatusIcon = crStatus.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your business verification and details
          </p>
        </div>
        <Badge variant={crStatus.variant} className="gap-1.5 px-3 py-1.5">
          <CrStatusIcon className="h-4 w-4" />
          {crStatus.label}
        </Badge>
      </div>

      {/* Rejection Notice */}
      {profile.crVerificationStatus === "REJECTED" && profile.rejectionReason && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Verification Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              <strong>Reason:</strong> {profile.rejectionReason}
            </p>
            <Button asChild>
              <Link href="/onboarding">
                Resubmit Documents
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending Notice */}
      {profile.crVerificationStatus === "PENDING" && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-700 dark:text-amber-500 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Verification In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your business documents are being reviewed. This typically takes 1-2 business days.
              You&apos;ll receive an email notification once the review is complete.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>
              Your registered business details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Business Type</label>
              <p className="mt-1">{businessTypeLabels[profile.businessType] || profile.businessType}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Company Name (English)</label>
              <p className="mt-1">{profile.companyNameEn}</p>
            </div>
            {profile.companyNameAr && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company Name (Arabic)</label>
                <p className="mt-1 text-right" dir="rtl">{profile.companyNameAr}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Member Since</label>
              <p className="mt-1">
                {new Date(profile.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
            <CardDescription>
              Business address information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Country</label>
              <p className="mt-1">{profile.country === "SA" ? "Saudi Arabia" : "Bahrain"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Region</label>
              <p className="mt-1">{profile.region || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">City</label>
              <p className="mt-1">{profile.city || "-"}</p>
            </div>
            {profile.addressLine1 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <p className="mt-1">{profile.addressLine1}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Registration Documents
            </CardTitle>
            <CardDescription>
              Business registration and tax information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <label className="text-sm font-medium text-muted-foreground">CR Number</label>
                <p className="mt-1 font-mono">{profile.crNumber || "Not provided"}</p>
              </div>
              <Badge variant={crStatus.variant} className="gap-1">
                <CrStatusIcon className="h-3 w-3" />
                {crStatus.label}
              </Badge>
            </div>
            {profile.vatNumber && (
              <div className="flex items-start justify-between">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">VAT Number</label>
                  <p className="mt-1 font-mono">{profile.vatNumber}</p>
                </div>
                {profile.vatVerificationStatus && (
                  <Badge variant={verificationStatusConfig[profile.vatVerificationStatus]?.variant || "secondary"}>
                    {verificationStatusConfig[profile.vatVerificationStatus]?.label || profile.vatVerificationStatus}
                  </Badge>
                )}
              </div>
            )}
            {profile.verifiedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Verified On</label>
                <p className="mt-1 text-sm text-green-600 dark:text-green-500">
                  {new Date(profile.verifiedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage your business presence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/equipment/new">
                <ExternalLink className="h-4 w-4 me-2" />
                List New Equipment
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/my-listings">
                <Building2 className="h-4 w-4 me-2" />
                View My Listings
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/my-leads">
                <FileText className="h-4 w-4 me-2" />
                View Leads
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
