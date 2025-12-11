import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
  Building2,
  User,
  HardHat,
  Factory,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  FileText,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { VerificationActions } from "./verification-actions";

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
  PENDING: { label: "Pending Review", variant: "secondary" as const, icon: Clock, color: "text-amber-600" },
  VERIFIED: { label: "Verified", variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
  REJECTED: { label: "Rejected", variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
  EXPIRED: { label: "Expired", variant: "outline" as const, icon: Clock, color: "text-gray-600" },
};

async function getVerification(id: string) {
  return prisma.businessProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          fullNameAr: true,
          email: true,
          phone: true,
          createdAt: true,
          country: true,
          preferredCurrency: true,
        },
      },
    },
  });
}

export default async function VerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getVerification(id);

  if (!profile) {
    notFound();
  }

  const BusinessIcon = BUSINESS_TYPE_ICONS[profile.businessType];
  const statusConfig = STATUS_STYLES[profile.crVerificationStatus];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/verifications">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{profile.companyNameEn}</h1>
            <p className="text-muted-foreground">{profile.companyNameAr}</p>
          </div>
        </div>
        <Badge variant={statusConfig.variant} className="text-sm py-1 px-3">
          <StatusIcon className={`w-4 h-4 me-2 ${statusConfig.color}`} />
          {statusConfig.label}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content - Left Column */}
        <div className="md:col-span-2 space-y-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <BusinessIcon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>
                    {BUSINESS_TYPE_LABELS[profile.businessType]}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Company Name (EN)</label>
                  <p className="font-medium">{profile.companyNameEn}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Company Name (AR)</label>
                  <p className="font-medium" dir="rtl">{profile.companyNameAr || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">CR Number</label>
                  <p className="font-medium font-mono">{profile.crNumber || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">VAT Number</label>
                  <p className="font-medium font-mono">{profile.vatNumber || "Not provided"}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                <div>
                  <label className="text-sm text-muted-foreground">Location</label>
                  <p className="font-medium">{profile.city}, {profile.region}</p>
                  <p className="text-sm text-muted-foreground">
                    {[profile.addressLine1, profile.addressLine2, profile.postalCode].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>

              {(profile.businessPhone || profile.businessEmail) && (
                <>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    {profile.businessPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">{profile.businessPhone}</span>
                      </div>
                    )}
                    {profile.businessEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{profile.businessEmail}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Uploaded Documents
              </CardTitle>
              <CardDescription>
                Review the submitted verification documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* CR Document */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Commercial Registration (CR)</h4>
                    {profile.crDocumentUrl ? (
                      <Badge variant="outline" className="text-green-600">
                        Uploaded
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Missing</Badge>
                    )}
                  </div>
                  {profile.crDocumentUrl ? (
                    <a
                      href={profile.crDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Document
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No document uploaded</p>
                  )}
                </div>

                {/* VAT Document */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">VAT Certificate</h4>
                    {profile.vatDocumentUrl ? (
                      <Badge variant="outline" className="text-green-600">
                        Uploaded
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                  </div>
                  {profile.vatDocumentUrl ? (
                    <a
                      href={profile.vatDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Document
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No document uploaded</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Bank Details
              </CardTitle>
              <CardDescription>
                Payout account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.bankName || profile.bankAccountName || profile.bankIban ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <Building className="w-4 h-4 mt-1 text-muted-foreground" />
                      <div>
                        <label className="text-sm text-muted-foreground">Bank Name</label>
                        <p className="font-medium">{profile.bankName || "Not provided"}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Account Holder</label>
                      <p className="font-medium">{profile.bankAccountName || "Not provided"}</p>
                    </div>
                  </div>
                  {profile.bankIban && (
                    <div>
                      <label className="text-sm text-muted-foreground">IBAN</label>
                      <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                        {profile.bankIban}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-center py-4">No bank details provided</p>
              )}
            </CardContent>
          </Card>

          {/* Verification History */}
          {(profile.verifiedAt || profile.rejectionReason) && (
            <Card>
              <CardHeader>
                <CardTitle>Verification History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.verifiedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Verified on {format(profile.verifiedAt, "PPP 'at' p")}</span>
                  </div>
                )}
                {profile.rejectionReason && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <XCircle className="w-4 h-4" />
                      <span>Rejection Reason:</span>
                    </div>
                    <p className="text-sm bg-red-50 border border-red-200 p-3 rounded">
                      {profile.rejectionReason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Owner Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Owner Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Full Name</label>
                <p className="font-medium">{profile.user.fullName}</p>
                {profile.user.fullNameAr && (
                  <p className="text-sm text-muted-foreground" dir="rtl">
                    {profile.user.fullNameAr}
                  </p>
                )}
              </div>

              {profile.user.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${profile.user.email}`} className="text-sm hover:underline">
                    {profile.user.email}
                  </a>
                </div>
              )}

              {profile.user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${profile.user.phone}`} className="text-sm hover:underline font-mono">
                    {profile.user.phone}
                  </a>
                </div>
              )}

              <Separator />

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Joined {formatDistanceToNow(profile.user.createdAt, { addSuffix: true })}
                </span>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Country:</span>{" "}
                <span className="font-medium">
                  {profile.user.country === "SA" ? "Saudi Arabia" : "Bahrain"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Submission Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span>{format(profile.createdAt, "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{format(profile.updatedAt, "PPP")}</span>
                </div>
                {profile.verifiedAt && (
                  <div className="flex justify-between text-green-600">
                    <span>Verified</span>
                    <span>{format(profile.verifiedAt, "PPP")}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Card */}
          {profile.crVerificationStatus === "PENDING" && (
            <VerificationActions profileId={profile.id} />
          )}
        </div>
      </div>
    </div>
  );
}
