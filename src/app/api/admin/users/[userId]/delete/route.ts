// src/app/api/admin/users/[userId]/delete/route.ts
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

  if (numericUserId === admin.id) {
    return NextResponse.json(
      { error: "You cannot delete your own admin account." },
      { status: 400 }
    );
  }

  const [user, createdOrgCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: numericUserId },
      select: { id: true, email: true },
    }),
    prisma.organization.count({
      where: { createdBy: numericUserId },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (createdOrgCount > 0) {
    return NextResponse.json(
      {
        error:
          "This user created one or more organizations. Reassign or remove those organizations before hard deleting the user.",
      },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.creditWallet.findUnique({
      where: { userId: numericUserId },
      select: { id: true },
    });

    // invitedBy is optional -> null it out first
    await tx.organizationMember.updateMany({
      where: { invitedBy: numericUserId },
      data: { invitedBy: null },
    });

    // user-owned related rows
    await tx.session.deleteMany({
      where: { userId: numericUserId },
    });

    await tx.adminSession.deleteMany({
      where: { userId: numericUserId },
    });

    await tx.favoriteService.deleteMany({
      where: { userId: numericUserId },
    });

    await tx.passwordResetToken.deleteMany({
      where: { userId: numericUserId },
    });

    await tx.emailVerificationToken.deleteMany({
      where: { userId: numericUserId },
    });

    await tx.complianceConsent.deleteMany({
      where: { userId: numericUserId },
    });

    // delete all transactions owned by this user
    await tx.transaction.deleteMany({
      where: { userId: numericUserId },
    });

    // remove organization memberships
    await tx.organizationMember.deleteMany({
      where: { userId: numericUserId },
    });

    if (wallet) {
      await tx.billingProfile.deleteMany({
        where: { walletId: wallet.id },
      });

      await tx.creditTransaction.deleteMany({
        where: { walletId: wallet.id },
      });

      await tx.creditWallet.delete({
        where: { id: wallet.id },
      });
    }

    await tx.user.delete({
      where: { id: numericUserId },
    });
  });

  return NextResponse.json({ ok: true });
}