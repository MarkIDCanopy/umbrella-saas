// src/app/api/admin/organizations/[orgId]/delete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;
  const numericOrgId = Number(orgId);

  if (!Number.isInteger(numericOrgId) || numericOrgId <= 0) {
    return NextResponse.json(
      { error: "Invalid organization id." },
      { status: 400 }
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { id: numericOrgId },
    select: {
      id: true,
      name: true,
      creditWallet: {
        select: {
          id: true,
        },
      },
      members: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!organization) {
    return NextResponse.json(
      { error: "Organization not found." },
      { status: 404 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const memberIds = organization.members.map((m) => m.id);

    if (memberIds.length > 0) {
      await tx.organizationInviteToken.deleteMany({
        where: {
          memberId: {
            in: memberIds,
          },
        },
      });
    }

    await tx.session.updateMany({
      where: { activeOrgId: numericOrgId },
      data: { activeOrgId: null },
    });

    await tx.user.updateMany({
      where: { lastActiveOrgId: numericOrgId },
      data: { lastActiveOrgId: null },
    });

    await tx.favoriteService.deleteMany({
      where: { organizationId: numericOrgId },
    });

    await tx.complianceConsent.deleteMany({
      where: { organizationId: numericOrgId },
    });

    await tx.transaction.deleteMany({
      where: { organizationId: numericOrgId },
    });

    await tx.organizationMember.deleteMany({
      where: { organizationId: numericOrgId },
    });

    if (organization.creditWallet) {
      await tx.creditTransaction.deleteMany({
        where: { walletId: organization.creditWallet.id },
      });

      await tx.billingProfile.deleteMany({
        where: { walletId: organization.creditWallet.id },
      });

      await tx.creditWallet.delete({
        where: { id: organization.creditWallet.id },
      });
    }

    await tx.organization.delete({
      where: { id: numericOrgId },
    });
  });

  return NextResponse.json({ ok: true });
}