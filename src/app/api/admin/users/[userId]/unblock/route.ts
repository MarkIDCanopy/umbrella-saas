// src/app/api/admin/users/[userId]/unblock/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(
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

  await prisma.user.update({
    where: { id: numericUserId },
    data: {
      isBlocked: false,
      blockedAt: null,
      blockedUntil: null,
      blockedReason: null,
    },
  });

  return NextResponse.json({ ok: true });
}