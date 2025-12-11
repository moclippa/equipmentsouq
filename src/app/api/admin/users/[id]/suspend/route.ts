import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const suspendSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Don't allow suspending yourself
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot suspend your own account" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { reason } = suspendSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Don't allow suspending other admins
    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Cannot suspend admin accounts" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      // Update user
      prisma.user.update({
        where: { id },
        data: {
          isSuspended: true,
          suspendedAt: new Date(),
          suspendedReason: reason,
        },
      }),
      // Log the action
      prisma.adminAuditLog.create({
        data: {
          adminId: session.user.id,
          action: "SUSPEND_USER",
          targetType: "User",
          targetId: id,
          details: { reason },
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
    console.error("Error suspending user:", error);
    return NextResponse.json(
      { error: "Failed to suspend user" },
      { status: 500 }
    );
  }
}
