// src/app/api/admin/organizations/[orgId]/credits/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;
  const numericOrgId = Number(orgId);

  if (!Number.isInteger(numericOrgId) || numericOrgId <= 0) {
    return NextResponse.json({ error: "Invalid organization id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { amount?: number };
  const amount = Number(body.amount);

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive integer." },
      { status: 400 }
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { id: numericOrgId },
    select: { id: true, name: true },
  });

  if (!organization) {
    return NextResponse.json(
      { error: "Organization not found." },
      { status: 404 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.creditWallet.upsert({
      where: { organizationId: numericOrgId },
      update: {},
      create: {
        organizationId: numericOrgId,
        balance: 0,
      },
      select: {
        id: true,
      },
    });

    await tx.creditWallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    await tx.creditTransaction.create({
      data: {
        walletId: wallet.id,
        type: "adjustment",
        source: "internal",
        delta: amount,
        description: `Admin org top-up: ${organization.name} (+${amount} credits)`,
      },
    });
  });

  return NextResponse.json({ ok: true });
}