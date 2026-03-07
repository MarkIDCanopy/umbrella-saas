// src/app/api/organizations/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, updateSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params; // ✅ unwrap the Promise
    const orgId = Number(id);

    if (!Number.isFinite(orgId)) {
      return NextResponse.json({ error: "Invalid organization id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { error: "Name must be between 2 and 80 characters." },
        { status: 400 }
      );
    }

    // must be ACTIVE owner/admin
    const actor = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: session.userId,
        status: "active",
        role: { in: ["owner", "admin"] },
      },
      select: { id: true },
    });

    if (!actor) {
      return NextResponse.json(
        { error: "Only an owner or admin can update the organization." },
        { status: 403 }
      );
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { name },
      select: { id: true, name: true },
    });

    return NextResponse.json({ organization: updated });
  } catch (e) {
    console.error("PATCH ORG ERROR:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params; // ✅ unwrap the Promise
    const orgId = Number(id);

    if (!Number.isFinite(orgId)) {
      return NextResponse.json({ error: "Invalid organization id" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // must be ACTIVE OWNER
      const actor = await tx.organizationMember.findFirst({
        where: {
          organizationId: orgId,
          userId: session.userId,
          status: "active",
          role: "owner",
        },
        select: { id: true },
      });

      if (!actor) {
        return {
          ok: false as const,
          status: 403,
          error: "Only an owner can delete the organization.",
        };
      }

      const activeMembers = await tx.organizationMember.findMany({
        where: { organizationId: orgId, status: "active" },
        select: { userId: true, role: true },
      });

      const memberCount = activeMembers.length;
      const ownersCount = activeMembers.filter((m) => m.role === "owner").length;

      // if there are other members, require another owner besides the actor
      if (memberCount > 1 && ownersCount <= 1) {
        return {
          ok: false as const,
          status: 400,
          error:
            "You can’t delete this organization because it has other members and you are the only owner. Promote another owner first or remove all members.",
        };
      }

      await tx.organizationMember.deleteMany({ where: { organizationId: orgId } });

      const wallet = await tx.creditWallet.findUnique({
        where: { organizationId: orgId },
        select: { id: true },
      });
      if (wallet) {
        await tx.billingProfile.deleteMany({ where: { walletId: wallet.id } });
        await tx.creditTransaction.deleteMany({ where: { walletId: wallet.id } });
        await tx.creditWallet.delete({ where: { id: wallet.id } });
      }

      await tx.favoriteService.deleteMany({ where: { organizationId: orgId } });
      await tx.transaction.deleteMany({ where: { organizationId: orgId } });

      await tx.organization.delete({ where: { id: orgId } });

      return { ok: true as const };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // if user was in this org workspace, drop back to personal
    if (session.activeOrgId && Number(session.activeOrgId) === orgId) {
      await updateSession(session.sessionId, { activeOrgId: null });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE ORG ERROR:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}