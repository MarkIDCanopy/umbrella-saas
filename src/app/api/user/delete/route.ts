// src/app/api/user/delete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/UserAuth";
import { cookies } from "next/headers";

function prismaErrorToJson(err: any) {
  return {
    message: err?.message,
    code: err?.code,
    meta: err?.meta,
    clientVersion: err?.clientVersion,
    cause: err?.cause
      ? {
          message: err.cause?.message,
          code: err.cause?.code,
          meta: err.cause?.meta,
          stack: err.cause?.stack,
        }
      : undefined,
    stack: err?.stack,
  };
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 1) Load ACTIVE org memberships for ownership checks
    const myMemberships = await prisma.organizationMember.findMany({
      where: { userId: user.id, status: "active" },
      select: {
        organizationId: true,
        role: true,
        organization: { select: { id: true, name: true } },
      },
    });

    const owned = myMemberships.filter((m) => m.role === "owner");

    // 2) Block: last owner + has teammates
    for (const m of owned) {
      const orgId = m.organizationId;
      const orgName = m.organization?.name ?? "Organization";

      const membersCount = await prisma.organizationMember.count({
        where: { organizationId: orgId, status: "active" },
      });

      const otherOwnersCount = await prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          status: "active",
          role: "owner",
          userId: { not: user.id },
        },
      });

      if (membersCount > 1 && otherOwnersCount === 0) {
        return NextResponse.json(
          {
            error: `You are the last owner of "${orgName}" and it still has other members. Please assign a new owner before deleting your account.`,
            code: "LAST_OWNER",
            details: { organizationId: orgId, organizationName: orgName, membersCount },
          },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      // 3) If user owns org(s) with no teammates -> delete those orgs
      for (const m of owned) {
        const orgId = m.organizationId;

        const membersCount = await tx.organizationMember.count({
          where: { organizationId: orgId, status: "active" },
        });

        if (membersCount <= 1) {
          // Delete membership rows (invites etc.)
          await tx.organizationMember.deleteMany({ where: { organizationId: orgId } });

          // If your schema has org wallet/txns/etc and FK isn't cascade, clean them too:
          // NOTE: adjust if your actual relations differ
          await tx.transaction.deleteMany({ where: { organizationId: orgId } });
          await tx.favoriteService.deleteMany({ where: { organizationId: orgId } });

          const orgWallet = await tx.creditWallet.findUnique({
            where: { organizationId: orgId },
            select: { id: true },
          });

          if (orgWallet) {
            await tx.creditTransaction.deleteMany({ where: { walletId: orgWallet.id } });
            await tx.billingProfile.deleteMany({ where: { walletId: orgWallet.id } });
            await tx.creditWallet.deleteMany({ where: { id: orgWallet.id } });
          }

          // Finally delete org
          await tx.organization.deleteMany({ where: { id: orgId } });
        }
      }

      // 4) Clean USER-owned dependent rows that may have RESTRICT FKs
      // This fixes your current crash (email_verification_tokens FK)
      await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });

      // Other user-scoped rows (safe even if already cascades)
      await tx.complianceConsent.deleteMany({ where: { userId: user.id } });
      await tx.favoriteService.deleteMany({ where: { userId: user.id } });
      await tx.transaction.deleteMany({ where: { userId: user.id } });

      // Personal wallet cleanup (if exists)
      const personalWallet = await tx.creditWallet.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (personalWallet) {
        await tx.creditTransaction.deleteMany({ where: { walletId: personalWallet.id } });
        await tx.billingProfile.deleteMany({ where: { walletId: personalWallet.id } });
        await tx.creditWallet.deleteMany({ where: { id: personalWallet.id } });
      }

      // Memberships + sessions
      await tx.organizationMember.deleteMany({ where: { userId: user.id } });
      await tx.session.deleteMany({ where: { userId: user.id } });

      // Finally delete the user
      await tx.user.delete({ where: { id: user.id } });
    });

    // Clear session cookie
    const cookieStore = await cookies();
    cookieStore.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return NextResponse.json({ message: "Account deleted" }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE USER ERROR (raw):", err);
    console.error("DELETE USER ERROR (details):", prismaErrorToJson(err));

    return NextResponse.json(
      { error: "Failed to delete account", debug: prismaErrorToJson(err) },
      { status: 500 }
    );
  }
}
