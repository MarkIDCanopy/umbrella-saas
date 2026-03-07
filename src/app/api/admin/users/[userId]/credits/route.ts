// src/app/api/admin/users/[userId]/credits/route.ts
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

  const body = (await req.json().catch(() => ({}))) as {
    amount?: number;
    description?: string;
  };

  const amount = Number(body.amount);

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive integer." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: numericUserId },
    select: { id: true, deletedAt: true, email: true },
  });

  if (!user || user.deletedAt) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.creditWallet.upsert({
      where: { userId: numericUserId },
      update: {
        balance: {
          increment: amount,
        },
        updatedAt: new Date(),
      },
      create: {
        userId: numericUserId,
        balance: amount,
      },
      select: {
        id: true,
        balance: true,
      },
    });

    await tx.creditTransaction.create({
      data: {
        walletId: wallet.id,
        type: "adjustment",
        source: "internal",
        delta: amount,
        description:
          body.description?.trim() ||
          `Admin credit top-up by ${admin.email}`,
      },
    });

    return wallet;
  });

  return NextResponse.json({
    ok: true,
    balance: result.balance,
  });
}