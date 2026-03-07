// src/app/api/session/active-org/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, updateSession } from "@/lib/session";

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    organizationId?: number | null;
  };

  const orgIdRaw = body.organizationId;

  // Personal workspace
  if (orgIdRaw === null) {
    await prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: session.sessionId },
        data: { activeOrgId: null, updatedAt: new Date() },
      });

      await tx.user.update({
        where: { id: session.userId },
        data: { lastActiveOrgId: null, updatedAt: new Date() },
      });
    });

    return NextResponse.json({ success: true });
  }

  const orgId = Number(orgIdRaw);
  if (!Number.isFinite(orgId)) {
    return NextResponse.json({ error: "Invalid organizationId" }, { status: 400 });
  }

  // ✅ Validate membership
  const membership = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: session.userId,
      status: "active",
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "You are not an active member of this organization." },
      { status: 403 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: session.sessionId },
      data: { activeOrgId: orgId, updatedAt: new Date() },
    });

    await tx.user.update({
      where: { id: session.userId },
      data: { lastActiveOrgId: orgId, updatedAt: new Date() },
    });
  });

  return NextResponse.json({ success: true });
}