// src/app/api/billing/setup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBillingContext } from "@/lib/billing/context";
import { getOrCreateWallet } from "@/lib/billing/wallet";
import { validateVatForCountry, cleanTaxId } from "@/lib/vat";

function normalizeISO2(input: unknown, fallback = "AT"): string {
  const v = String(input ?? "").trim();
  if (!v) return fallback;
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  return fallback;
}

function jsonError(message: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json(
    { error: message, ...(extra ?? {}) },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  try {
    const ctx = await getBillingContext();
    if (!ctx) return jsonError("Unauthorized", 401);

    // ✅ ORG guard: only owner/admin can change org billing profile
    if (ctx.kind === "org") {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          status: "active",
          role: { in: ["owner", "admin"] },
        },
        select: { id: true },
      });

      if (!membership) {
        return jsonError(
          "Forbidden: only owners/admins can update organization billing.",
          403,
          { code: "FORBIDDEN_ORG_BILLING" }
        );
      }
    }

    const body = (await req.json().catch(() => ({}))) as {
      mode: "personal" | "company";
      billingName: string;
      billingEmail: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      postalCode: string;
      country: string; // ISO-2
      taxId?: string;
    };

    const {
      mode,
      billingName,
      billingEmail,
      addressLine1,
      addressLine2,
      city,
      postalCode,
      country,
      taxId,
    } = body;

    if (!billingName || !billingEmail || !addressLine1 || !city || !postalCode || !country) {
      return jsonError("Missing required billing fields", 400, {
        code: "MISSING_FIELDS",
      });
    }

    const owner =
      ctx.kind === "org"
        ? ({ kind: "org", organizationId: ctx.organizationId } as const)
        : ({ kind: "user", userId: ctx.userId } as const);

    // org context always company billing
    const effectiveMode: "personal" | "company" =
      ctx.kind === "org" ? "company" : mode;

    const wallet = await getOrCreateWallet(owner);

    const cleanBillingName = String(billingName).trim();
    const cleanEmail = String(billingEmail).trim().toLowerCase();
    const cleanCountry = normalizeISO2(country, "AT");
    const cleanVat = taxId ? cleanTaxId(taxId) : "";

    // ✅ VAT safeguards (company only) + store normalized VAT
    let normalizedVat: string | null = null;
    if (effectiveMode === "company" && cleanVat) {
      const v = validateVatForCountry(cleanVat, cleanCountry);
      if (!v.ok) {
        return jsonError(v.reason, 400, {
          code: "INVALID_VAT",
          vat: v.normalized,
          country: cleanCountry,
        });
      }
      normalizedVat = v.normalized;
    }

    await prisma.$transaction(async (tx) => {
      await tx.billingProfile.upsert({
        where: { walletId: wallet.id },
        update: {
          billingType: effectiveMode,
          email: cleanEmail,
          fullName: effectiveMode === "personal" ? cleanBillingName : null,
          companyName: effectiveMode === "company" ? cleanBillingName : null,
          vatNumber: effectiveMode === "company" ? normalizedVat : null,
          addressLine1,
          addressLine2: addressLine2 ?? null,
          city,
          postalCode,
          country: cleanCountry,
          updatedAt: new Date(),
        },
        create: {
          walletId: wallet.id,
          stripeCustomerId: null,
          billingType: effectiveMode,
          email: cleanEmail,
          fullName: effectiveMode === "personal" ? cleanBillingName : null,
          companyName: effectiveMode === "company" ? cleanBillingName : null,
          vatNumber: effectiveMode === "company" ? normalizedVat : null,
          addressLine1,
          addressLine2: addressLine2 ?? null,
          city,
          postalCode,
          country: cleanCountry,
        },
      });

      // personal billing -> user settings sync (email + country)
      if (ctx.kind === "personal") {
        await tx.user.update({
          where: { id: ctx.userId },
          data: { email: cleanEmail, country: cleanCountry, updatedAt: new Date() },
        });
      }
    });

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("BILLING SETUP ERROR:", e);
    return jsonError("Server error in billing setup", 500, {
      code: "BILLING_SETUP_ERROR",
    });
  }
}