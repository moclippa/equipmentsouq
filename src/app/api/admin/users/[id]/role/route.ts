import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { UserRole } from "@prisma/client";

const roleSchema = z.object({
  role: z.enum(["GUEST", "RENTER", "OWNER", "ADMIN"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Don't allow changing your own role
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { role } = roleSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const previousRole = user.role;

    await prisma.$transaction([
      // Update user role
      prisma.user.update({
        where: { id },
        data: { role: role as UserRole },
      }),
      // Log the action
      prisma.adminAuditLog.create({
        data: {
          adminId: session.user.id,
          action: "CHANGE_USER_ROLE",
          targetType: "User",
          targetId: id,
          details: {
            previousRole,
            newRole: role,
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return NextResponse.json(
        { error: zodError.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }
    console.error("Error changing user role:", error);
    return NextResponse.json(
      { error: "Failed to change user role" },
      { status: 500 }
    );
  }
}
