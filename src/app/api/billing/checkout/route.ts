// src/app/api/billing/checkout/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getBillingContext } from "@/lib/billing/context";
import { getOrCreateWallet } from "@/lib/billing/wallet";

export const runtime = "nodejs";

const MIN_PURCHASE_CREDITS = 100;
const BASE_PRICE_PER_CREDIT_CENTS = 25;

function discountForCredits(credits: number): number {
  if (credits >= 10000) return 0.2;
  if (credits >= 1000) return 0.1;
  return 0;
}

function clampInt(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function normalizeCountryIso2(v?: string | null) {
  const s = String(v ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : null;
}

function normalizeVat(v?: string | null) {
  let s = String(v ?? "").trim();
  if (!s) return null;
  s = s.toUpperCase();
  s = s.replace(/^VAT[\s:.-]*/i, "");
  s = s.replace(/^UID[\s:.-]*/i, "");
  s = s.replace(/^UST-IDNR[\s:.-]*/i, "");
  s = s.replace(/[\s.-]/g, "");
  s = s.replace(/[^A-Z0-9]/g, "");
  return s || null;
}

function looksLikeEuVat(v: string) {
  if (v.length < 6) return false;
  const cc = v.slice(0, 2);
  return /^[A-Z]{2}$/.test(cc);
}

function stripeErrMsg(e: any) {
  return e?.raw?.message || e?.message || String(e);
}

// ✅ remove undefined/null/empty keys so Stripe doesn't clear fields
function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const ctx = await getBillingContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

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
        return NextResponse.json(
          { error: "Forbidden: only owners/admins can buy credits for an organization." },
          { status: 403 }
        );
      }
    }

    const body = (await req.json().catch(() => ({}))) as { credits?: number };
    const credits = clampInt(Number(body?.credits));
    if (!credits || credits < MIN_PURCHASE_CREDITS) {
      return NextResponse.json(
        { error: `Minimum purchase is ${MIN_PURCHASE_CREDITS} credits` },
        { status: 400 }
      );
    }

    const owner =
      ctx.kind === "org"
        ? ({ kind: "org", organizationId: ctx.organizationId } as const)
        : ({ kind: "user", userId: ctx.userId } as const);

    const wallet = await getOrCreateWallet(owner);

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

    if (!billingProfile) {
      return NextResponse.json(
        { error: "No billing profile found. Complete billing setup first." },
        { status: 400 }
      );
    }

    const isoCountry = normalizeCountryIso2(billingProfile.country);
    if (!isoCountry) {
      return NextResponse.json(
        { error: "Billing country must be a 2-letter ISO code (e.g., AT, DE)." },
        { status: 400 }
      );
    }

    const discount = discountForCredits(credits);
    const totalAmountCents = Math.round(
      credits * BASE_PRICE_PER_CREDIT_CENTS * (1 - discount)
    );
    if (totalAmountCents < 50) {
      return NextResponse.json(
        { error: "Amount too small to charge. Increase credits." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const isCompany = billingProfile.billingType === "company";
    const taxIdCollectionEnabled = isCompany;

    const billingAddressCollection = isCompany ? ("auto" as const) : ("required" as const);

    const customerUpdate = taxIdCollectionEnabled
    // company: Stripe requires name:auto for tax_id_collection
    // but DO NOT let Checkout overwrite/clear your saved address
    ? ({ name: "auto", address: "never" } as const)
    // personal: don't overwrite name with cardholder, but allow address sync
    : ({ name: "never", address: "auto" } as const);

    const customerName = isCompany ? billingProfile.companyName : billingProfile.fullName;

    // ✅ build address without undefined keys (prevents Stripe clearing)
    const customerAddress = compact({
      country: isoCountry,
      line1: billingProfile.addressLine1 ?? undefined,
      line2: billingProfile.addressLine2 ?? undefined,
      city: billingProfile.city ?? undefined,
      postal_code: billingProfile.postalCode ?? undefined,
    });

    // ✅ only include address if it has keys
    const customerPayload = compact({
      email: billingProfile.email ?? undefined,
      name: customerName ?? undefined,
      address: Object.keys(customerAddress).length ? customerAddress : undefined,
    });

    let customerId = billingProfile.stripeCustomerId ?? null;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const created = await stripe.customers.create({
        ...(customerPayload as any),
        metadata: {
          walletId: wallet.id.toString(),
          billingProfileId: billingProfile.id.toString(),
          contextKind: ctx.kind,
          organizationId: ctx.kind === "org" ? String(ctx.organizationId) : "",
          userId: String(ctx.userId),
        },
      });

      customerId = created.id;

      await prisma.billingProfile.update({
        where: { id: billingProfile.id },
        data: { stripeCustomerId: customerId },
      });
    } else {
      // ✅ only send compact payload so we never null fields
      await stripe.customers.update(customerId, customerPayload as any);
    }

    const vat = isCompany ? normalizeVat(billingProfile.vatNumber) : null;
    if (vat && looksLikeEuVat(vat)) {
      try {
        const existing = await stripe.customers.listTaxIds(customerId, { limit: 100 });
        const already = existing.data.some(
          (t) => t.type === "eu_vat" && t.value.replace(/\s/g, "") === vat.replace(/\s/g, "")
        );
        if (!already) {
          await stripe.customers.createTaxId(customerId, { type: "eu_vat", value: vat });
        }
      } catch (err: any) {
        console.warn("VAT SYNC FAILED (continuing):", stripeErrMsg(err));
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${appUrl}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing?status=cancelled`,
      customer: customerId,

      customer_update: customerUpdate,
      billing_address_collection: billingAddressCollection,

      tax_id_collection: { enabled: taxIdCollectionEnabled },
      automatic_tax: { enabled: true },
      invoice_creation: { enabled: true },

      line_items: [
        {
          price_data: {
            currency: "eur",
            tax_behavior: "exclusive",
            product_data: {
              name: "Umbrella Credits",
              description: `${credits} prepaid credits`,
            },
            unit_amount: totalAmountCents,
          },
          quantity: 1,
        },
      ],

      metadata: {
        walletId: wallet.id.toString(),
        credits: credits.toString(),
        basePricePerCreditCents: BASE_PRICE_PER_CREDIT_CENTS.toString(),
        discount: discount.toString(),
        totalAmountCents: totalAmountCents.toString(),
        contextKind: ctx.kind,
        organizationId: ctx.kind === "org" ? String(ctx.organizationId) : "",
        userId: String(ctx.userId),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    const details = stripeErrMsg(e);
    console.error("CHECKOUT ERROR:", details, e);
    return NextResponse.json({ error: "Failed to create checkout session", details }, { status: 500 });
  }
}