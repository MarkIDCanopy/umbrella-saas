// src/app/api/favorites/[serviceId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  _req: Request,
  context: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await context.params; // 🔥 REQUIRED
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.activeOrgId) {
    const existing = await prisma.favoriteService.findFirst({
      where: {
        serviceId,
        organizationId: session.activeOrgId,
      },
    });

    if (!existing) {
      await prisma.favoriteService.create({
        data: {
          serviceId,
          organizationId: session.activeOrgId,
        },
      });
    }
  } else {
    const existing = await prisma.favoriteService.findFirst({
      where: {
        serviceId,
        userId: session.userId,
      },
    });

    if (!existing) {
      await prisma.favoriteService.create({
        data: {
          serviceId,
          userId: session.userId,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await context.params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.favoriteService.deleteMany({
    where: session.activeOrgId
      ? { serviceId, organizationId: session.activeOrgId }
      : { serviceId, userId: session.userId },
  });

  return NextResponse.json({ success: true });
}
