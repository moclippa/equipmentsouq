import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { UserActions } from "./user-actions";
import {
  UserProfileCard,
  UserStatsCard,
  UserBusinessCard,
  UserEquipmentTable,
  UserDetail,
} from "@/components/features/admin-users";

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

  const userDetail = user as unknown as UserDetail;

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
        <UserProfileCard user={userDetail} />

        {/* Stats Card */}
        <div className="space-y-6">
          <UserStatsCard
            equipmentCount={user._count.equipment}
            notificationsCount={user._count.notifications}
          />

          {/* Business Profile */}
          {user.businessProfile && (
            <UserBusinessCard businessProfile={user.businessProfile} />
          )}
        </div>
      </div>

      {/* Recent Equipment */}
      <UserEquipmentTable
        equipment={userDetail.equipment}
        totalCount={user._count.equipment}
        userId={user.id}
      />
    </div>
  );
}
