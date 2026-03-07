// src/app/api/admin/admin-users/[userId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const numericUserId = Number(userId);

  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  if (numericUserId === admin.id) {
    return NextResponse.json(
      { error: "You cannot remove your own admin access." },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: numericUserId },
      data: {
        isAdmin: false,
        adminRole: null,
      },
    }),
    prisma.adminSession.deleteMany({
      where: { userId: numericUserId },
    }),
  ]);

  return NextResponse.json({ ok: true });
}