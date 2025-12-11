import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Package,
  Building2,
  Shield,
  Ban,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { UserActions } from "./user-actions";

async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      businessProfile: true,
      equipment: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          category: { select: { nameEn: true } },
          _count: { select: { leads: true } },
        },
      },
      _count: {
        select: {
          equipment: true,
          notifications: true,
        },
      },
    },
  });

  return user;
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="w-4 h-4 me-2" />
              Back to Users
            </Link>
          </Button>
        </div>
        <UserActions user={user} />
      </div>

      {/* User Profile Card */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-2xl font-bold">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-xl">{user.fullName}</CardTitle>
                  {user.fullNameAr && (
                    <p className="text-muted-foreground" dir="rtl">
                      {user.fullNameAr}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={user.role === "ADMIN" ? "destructive" : "secondary"}>
                      {user.role}
                    </Badge>
                    {user.isSuspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : user.isActive ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />

            {/* Contact Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              {user.email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                    {user.emailVerified && (
                      <span className="text-xs text-green-600">Verified</span>
                    )}
                  </div>
                </div>
              )}

              {user.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{user.phone}</p>
                    {user.phoneVerified && (
                      <span className="text-xs text-green-600">Verified</span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">
                    {user.country === "SA" ? "🇸🇦 Saudi Arabia" : "🇧🇭 Bahrain"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">
                    {format(user.createdAt, "PPP")}
                  </p>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <Separator />
            <div>
              <h3 className="font-medium mb-3">Preferences</h3>
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Language: </span>
                  <span className="font-medium">
                    {user.preferredLanguage === "ar" ? "Arabic" : "English"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Currency: </span>
                  <span className="font-medium">{user.preferredCurrency}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Login: </span>
                  <span className="font-medium">
                    {user.lastLoginAt
                      ? format(user.lastLoginAt, "PPp")
                      : "Never"}
                  </span>
                </div>
              </div>
            </div>

            {/* Suspension Info */}
            {user.isSuspended && (
              <>
                <Separator />
                <div className="p-4 bg-destructive/10 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <Ban className="w-4 h-4" />
                    <span className="font-medium">Account Suspended</span>
                  </div>
                  {user.suspendedAt && (
                    <p className="text-sm text-muted-foreground">
                      Suspended on {format(user.suspendedAt, "PPP")}
                    </p>
                  )}
                  {user.suspendedReason && (
                    <p className="text-sm mt-1">Reason: {user.suspendedReason}</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Equipment Listings</span>
                </div>
                <span className="font-bold">{user._count.equipment}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Notifications</span>
                </div>
                <span className="font-bold">{user._count.notifications}</span>
              </div>
            </CardContent>
          </Card>

          {/* Business Profile */}
          {user.businessProfile && (
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
                  <p className="font-medium">{user.businessProfile.companyNameEn}</p>
                  {user.businessProfile.companyNameAr && (
                    <p className="text-muted-foreground" dir="rtl">
                      {user.businessProfile.companyNameAr}
                    </p>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground">Business Type</p>
                  <p className="font-medium">{user.businessProfile.businessType}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground">CR Verification</p>
                  <Badge
                    variant={
                      user.businessProfile.crVerificationStatus === "VERIFIED"
                        ? "default"
                        : user.businessProfile.crVerificationStatus === "REJECTED"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {user.businessProfile.crVerificationStatus}
                  </Badge>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">
                    {user.businessProfile.city}, {user.businessProfile.region}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/admin/verifications/${user.businessProfile.id}`}>
                    View Full Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Equipment */}
      {user.equipment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Equipment Listings</CardTitle>
            <CardDescription>
              Latest {user.equipment.length} of {user._count.equipment} listings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="text-start py-2 px-2 font-medium">Equipment</th>
                    <th className="text-start py-2 px-2 font-medium">Category</th>
                    <th className="text-start py-2 px-2 font-medium">Status</th>
                    <th className="text-start py-2 px-2 font-medium">Leads</th>
                    <th className="text-start py-2 px-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {user.equipment.map((eq) => (
                    <tr key={eq.id} className="border-b last:border-0">
                      <td className="py-2 px-2">
                        <Link
                          href={`/admin/equipment/${eq.id}`}
                          className="font-medium hover:underline"
                        >
                          {eq.titleEn}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {eq.make} {eq.model} {eq.year}
                        </p>
                      </td>
                      <td className="py-2 px-2 text-sm">{eq.category.nameEn}</td>
                      <td className="py-2 px-2">
                        <Badge variant={eq.status === "ACTIVE" ? "default" : "secondary"}>
                          {eq.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-sm">{eq._count.leads}</td>
                      <td className="py-2 px-2 text-sm text-muted-foreground">
                        {format(eq.createdAt, "PP")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {user._count.equipment > 5 && (
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/equipment?ownerId=${user.id}`}>
                    View All {user._count.equipment} Listings
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
