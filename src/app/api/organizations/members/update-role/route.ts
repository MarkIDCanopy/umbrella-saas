// src/app/api/organizations/members/update-role/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type Role = "owner" | "admin" | "user";

function isRole(v: any): v is Role {
  return v === "owner" || v === "admin" || v === "user";
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.activeOrgId) {
    return NextResponse.json({ error: "No active org." }, { status: 400 });
  }

  const orgId = Number(session.activeOrgId);
  if (!Number.isFinite(orgId)) {
    return NextResponse.json({ error: "Invalid org id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    memberId?: number;
    role?: Role | "viewer";
  };

  const memberId = Number(body.memberId);
  const nextRoleRaw = body.role;

  if (!Number.isFinite(memberId)) {
    return NextResponse.json({ error: "Invalid memberId." }, { status: 400 });
  }
  if (!isRole(nextRoleRaw)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  const nextRole: Role = nextRoleRaw;

  // ✅ Actor must be active owner/admin
  const actor = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: session.userId,
      status: "active",
      role: { in: ["owner", "admin"] },
    },
    select: { role: true, id: true },
  });

  if (!actor) {
    return NextResponse.json(
      { error: "You do not have permission to change roles." },
      { status: 403 }
    );
  }

  // ✅ Target must belong to org
  const target = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: orgId },
    select: { id: true, role: true, status: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  // ✅ Admin cannot touch owners (and cannot create owners)
  if (actor.role === "admin") {
    if (target.role === "owner") {
      return NextResponse.json(
        { error: "Admins cannot change the role of an owner." },
        { status: 403 }
      );
    }
    if (nextRole === "owner") {
      return NextResponse.json(
        { error: "Only an owner can assign the owner role." },
        { status: 403 }
      );
    }
  }

  // ✅ Only owner can assign owner role
  if (nextRole === "owner" && actor.role !== "owner") {
    return NextResponse.json(
      { error: "Only an owner can assign the owner role." },
      { status: 403 }
    );
  }

  // ✅ Prevent demoting last active owner
  if (target.role === "owner" && target.status === "active" && nextRole !== "owner") {
    const ownersCount = await prisma.organizationMember.count({
      where: { organizationId: orgId, role: "owner", status: "active" },
    });

    if (ownersCount <= 1) {
      return NextResponse.json(
        { error: "You cannot demote the last owner." },
        { status: 400 }
      );
    }
  }

  await prisma.organizationMember.update({
    where: { id: target.id },
    data: { role: nextRole },
  });

  return NextResponse.json({ success: true });
}