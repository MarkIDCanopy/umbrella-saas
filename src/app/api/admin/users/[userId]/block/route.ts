// src/app/api/admin/users/[userId]/block/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(
  req: Request,
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
      { error: "You cannot block your own admin account." },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    mode?: "temporary" | "permanent";
    days?: number;
    reason?: string;
  };

  const mode = body.mode === "permanent" ? "permanent" : "temporary";
  const days = Number(body.days || 7);
  const reason = body.reason?.trim() || "Blocked by admin";

  const blockedUntil =
    mode === "permanent"
      ? null
      : new Date(Date.now() + Math.max(1, days) * 24 * 60 * 60 * 1000);

  const user = await prisma.user.findUnique({
    where: { id: numericUserId },
    select: { id: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: numericUserId },
      data: {
        isBlocked: true,
        blockedAt: new Date(),
        blockedUntil,
        blockedReason: reason,
      },
    }),
    prisma.session.deleteMany({
      where: { userId: numericUserId },
    }),
    prisma.adminSession.deleteMany({
      where: { userId: numericUserId },
    }),
  ]);

  return NextResponse.json({ ok: true });
}