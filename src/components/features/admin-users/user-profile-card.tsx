import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MapPin, Calendar, Ban } from "lucide-react";
import { format } from "date-fns";
import { UserDetail } from "./user-detail-types";

interface UserProfileCardProps {
  user: UserDetail;
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  return (
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
  );
}
