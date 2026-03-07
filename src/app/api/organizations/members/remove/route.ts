// src/app/api/organizations/members/remove/route.ts
import { NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.activeOrgId) {
    return NextResponse.json(
      { error: "No active organization selected." },
      { status: 400 }
    );
  }

  const orgId = Number(session.activeOrgId);
  if (!Number.isFinite(orgId)) {
    return NextResponse.json({ error: "Invalid organization id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { memberId?: number };
  const memberId = Number(body.memberId);

  if (!Number.isFinite(memberId)) {
    return NextResponse.json({ error: "Invalid memberId." }, { status: 400 });
  }

  // ✅ actor must be active owner/admin in this org
  const actor = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: session.userId,
      status: "active",
      role: { in: ["owner", "admin"] },
    },
    select: { role: true, userId: true },
  });

  if (!actor) {
    return NextResponse.json(
      { error: "You do not have permission to remove members from this organization." },
      { status: 403 }
    );
  }

  // ✅ target must belong to org
  const target = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: orgId },
    select: { id: true, role: true, userId: true, status: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  // ✅ Admins cannot remove owners
  if (actor.role === "admin" && target.role === "owner") {
    return NextResponse.json(
      { error: "Admins cannot remove an owner." },
      { status: 403 }
    );
  }

  // ✅ Prevent removing last active owner (even for owners)
  if (target.role === "owner" && target.status === "active") {
    const ownersCount = await prisma.organizationMember.count({
      where: { organizationId: orgId, role: "owner", status: "active" },
    });

    if (ownersCount <= 1) {
      return NextResponse.json(
        { error: "You cannot remove the last owner." },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.organizationInviteToken.deleteMany({ where: { memberId: target.id } });

    await tx.organizationMember.delete({ where: { id: target.id } });

    // clear org from removed user's sessions
    if (target.userId) {
      await tx.session.updateMany({
        where: { userId: target.userId, activeOrgId: orgId },
        data: { activeOrgId: null, updatedAt: new Date() },
      });
    }
  });

  // if removed member is YOU in this current session, clear workspace
  if (target.userId && target.userId === session.userId) {
    await updateSession(session.sessionId, { activeOrgId: null });
  }

  return NextResponse.json({ success: true });
}