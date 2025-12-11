import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isSuspended: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.isSuspended) {
      return NextResponse.json(
        { error: "User is not suspended" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      // Update user
      prisma.user.update({
        where: { id },
        data: {
          isSuspended: false,
          isActive: true,
          suspendedAt: null,
          suspendedReason: null,
        },
      }),
      // Log the action
      prisma.adminAuditLog.create({
        data: {
          adminId: session.user.id,
          action: "REACTIVATE_USER",
          targetType: "User",
          targetId: id,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reactivating user:", error);
    return NextResponse.json(
      { error: "Failed to reactivate user" },
      { status: 500 }
    );
  }
}
