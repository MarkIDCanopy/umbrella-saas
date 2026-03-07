// src/app/api/billing/summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBillingContext } from "@/lib/billing/context";
import { getOrCreateWallet } from "@/lib/billing/wallet";

export async function GET() {
  try {
    const ctx = await getBillingContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const owner =
      ctx.kind === "org"
        ? ({ kind: "org", organizationId: ctx.organizationId } as const)
        : ({ kind: "user", userId: ctx.userId } as const);

    const wallet = await getOrCreateWallet(owner);

    // ✅ Avoid extra DB query when not org
    const billingProfile = await prisma.billingProfile.findUnique({
      where: { walletId: wallet.id },
      select: {
        id: true,
        stripeCustomerId: true,
        billingType: true,
        email: true,
        fullName: true,
        companyName: true,
        vatNumber: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        postalCode: true,
        country: true,
      },
    });

    let org: { id: number; name: string; orgUid: string } | null = null;
    if (ctx.kind === "org") {
      org = await prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { id: true, name: true, orgUid: true },
      });
    }

    const billingOrgName =
      ctx.kind === "org" &&
      billingProfile?.billingType === "company" &&
      billingProfile.companyName
        ? billingProfile.companyName
        : null;

    const effectiveOrgName = billingOrgName || org?.name || "Organization";

    return NextResponse.json(
      {
        context: ctx.kind,
        organization:
          ctx.kind === "org"
            ? {
                id: org?.id ?? ctx.organizationId,
                name: effectiveOrgName,
                orgUid: org?.orgUid ?? null,
              }
            : null,
        walletId: wallet.id,
        balance: wallet.balance,
        hasBillingProfile: !!billingProfile,
        billingProfile: billingProfile
          ? {
              id: billingProfile.id,
              type: billingProfile.billingType,
              name:
                billingProfile.billingType === "company"
                  ? billingProfile.companyName
                  : billingProfile.fullName,
              email: billingProfile.email,
              country: billingProfile.country,
              addressLine1: billingProfile.addressLine1,
              addressLine2: billingProfile.addressLine2,
              city: billingProfile.city,
              postalCode: billingProfile.postalCode,
              taxId: billingProfile.vatNumber,
              hasStripeCustomer: !!billingProfile.stripeCustomerId,
            }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("BILLING SUMMARY ERROR:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}