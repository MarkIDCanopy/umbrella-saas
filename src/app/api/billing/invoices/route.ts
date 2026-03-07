// src/app/api/billing/invoices/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { getBillingContext } from "@/lib/billing/context";
import { getOrCreateWallet } from "@/lib/billing/wallet";

export const runtime = "nodejs";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("de-AT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatMoney(amountCents?: number | null, currency?: string | null) {
  if (amountCents == null) return "—";
  const c = (currency ?? "eur").toUpperCase();
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: c,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function stripeErrMsg(e: any) {
  return e?.raw?.message || e?.message || String(e);
}

async function receiptFromPaymentIntent(piId: string) {
  const pi = await stripe!.paymentIntents.retrieve(piId, { expand: ["charges"] });
  const ch = (pi as any)?.charges?.data?.[0] ?? null;
  return {
    receiptUrl: (ch?.receipt_url as string | null) ?? null,
    chargeId: (ch?.id as string | null) ?? null,
  };
}

async function receiptFromCharge(chargeId: string) {
  const ch = await stripe!.charges.retrieve(chargeId);
  return {
    receiptUrl: ((ch as any)?.receipt_url as string | null) ?? null,
    chargeId: ((ch as any)?.id as string | null) ?? null,
  };
}

// ✅ most reliable for your flow
async function receiptFromCheckoutSession(sessionId: string) {
  const s = await stripe!.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.charges"],
  });

  const pi: any = s.payment_intent;
  const ch = pi?.charges?.data?.[0] ?? null;

  return {
    receiptUrl: (ch?.receipt_url as string | null) ?? null,
    chargeId: (ch?.id as string | null) ?? null,
    paymentIntentId:
      typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null,
  };
}

export async function GET() {
  try {
    const ctx = await getBillingContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

    const owner =
      ctx.kind === "org"
        ? ({ kind: "org", organizationId: ctx.organizationId } as const)
        : ({ kind: "user", userId: ctx.userId } as const);

    const wallet = await getOrCreateWallet(owner);

    const rows = await prisma.creditTransaction.findMany({
      where: {
        walletId: wallet.id,
        type: "topup",
        source: "stripe",
        stripeInvoiceId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        createdAt: true,
        delta: true,

        stripeInvoiceId: true,
        stripeInvoiceHostedUrl: true,
        stripeInvoicePdfUrl: true,
        amountCents: true,
        currency: true,
        stripeInvoiceNumber: true,
        stripeInvoiceStatus: true,

        stripeCheckoutSessionId: true,
        stripePaymentIntentId: true,
        stripeReceiptUrl: true,
        stripeChargeId: true,
      },
    });

    // ✅ limit backfill per request to keep endpoint fast
    const MAX_BACKFILL = 5;

    const needsInvoiceBackfill = rows
      .filter(
        (r) =>
          !!r.stripeInvoiceId &&
          (!r.stripeInvoiceHostedUrl ||
            !r.stripeInvoicePdfUrl ||
            r.amountCents == null ||
            !r.currency ||
            !r.stripeInvoiceNumber ||
            !r.stripeInvoiceStatus)
      )
      .slice(0, MAX_BACKFILL);

    const needsReceiptBackfill = rows
      .filter((r) => !r.stripeReceiptUrl)
      .slice(0, MAX_BACKFILL);

    // -------------------------------
    // Invoice backfill (parallel)
    // -------------------------------
    await Promise.all(
      needsInvoiceBackfill.map(async (r) => {
        const invoiceId = r.stripeInvoiceId!;
        try {
          const inv = (await stripe.invoices.retrieve(invoiceId)) as Stripe.Invoice;

          const hostedUrl = inv.hosted_invoice_url ?? null;
          const pdfUrl = inv.invoice_pdf ?? null;

          const amountCents =
            typeof (inv as any).amount_paid === "number" && (inv as any).amount_paid > 0
              ? (inv as any).amount_paid
              : typeof (inv as any).amount_due === "number"
              ? (inv as any).amount_due
              : null;

          const currency = (inv as any).currency ?? null;
          const number = (inv as any).number ?? null;
          const status = (inv as any).status ?? null;

          await prisma.creditTransaction.update({
            where: { id: r.id },
            data: {
              stripeInvoiceHostedUrl: hostedUrl,
              stripeInvoicePdfUrl: pdfUrl,
              amountCents: amountCents ?? undefined,
              currency: currency ?? undefined,
              stripeInvoiceNumber: number ?? undefined,
              stripeInvoiceStatus: status ?? undefined,
            },
          });

          (r as any).stripeInvoiceHostedUrl = hostedUrl;
          (r as any).stripeInvoicePdfUrl = pdfUrl;
          (r as any).amountCents = amountCents;
          (r as any).currency = currency;
          (r as any).stripeInvoiceNumber = number;
          (r as any).stripeInvoiceStatus = status;
        } catch (e) {
          console.warn("Invoice backfill failed", { invoiceId, err: stripeErrMsg(e) });
        }
      })
    );

    // -------------------------------
    // Receipt backfill (parallel + robust order)
    // invoice.charge -> PI -> checkout session
    // -------------------------------
    await Promise.all(
      needsReceiptBackfill.map(async (r) => {
        try {
          let receiptUrl: string | null = null;
          let chargeId: string | null = null;
          let piId: string | null = r.stripePaymentIntentId ?? null;

          // Try invoice first
          if (r.stripeInvoiceId) {
            const inv: any = await stripe.invoices.retrieve(r.stripeInvoiceId);

            const invChargeId =
              typeof inv.charge === "string" ? inv.charge : inv.charge?.id ?? null;

            const invPiId =
              typeof inv.payment_intent === "string"
                ? inv.payment_intent
                : inv.payment_intent?.id ?? null;

            if (invChargeId) {
              const got = await receiptFromCharge(invChargeId);
              receiptUrl = got.receiptUrl;
              chargeId = got.chargeId;
            } else {
              piId = piId ?? invPiId ?? null;
              if (piId) {
                const got = await receiptFromPaymentIntent(piId);
                receiptUrl = got.receiptUrl;
                chargeId = got.chargeId;
              }
            }
          }

          // Fallback: checkout session (best for your Checkout flow)
          if (!receiptUrl && r.stripeCheckoutSessionId) {
            const got = await receiptFromCheckoutSession(r.stripeCheckoutSessionId);
            receiptUrl = got.receiptUrl;
            chargeId = chargeId ?? got.chargeId;
            piId = piId ?? got.paymentIntentId;
          }

          if (!receiptUrl && !chargeId && !piId) return;

          await prisma.creditTransaction.update({
            where: { id: r.id },
            data: {
              stripeReceiptUrl: receiptUrl ?? undefined,
              stripeChargeId: chargeId ?? undefined,
              stripePaymentIntentId: r.stripePaymentIntentId ?? piId ?? undefined,
            },
          });

          (r as any).stripeReceiptUrl = receiptUrl;
          (r as any).stripeChargeId = chargeId;
          (r as any).stripePaymentIntentId = r.stripePaymentIntentId ?? piId;
        } catch (e) {
          console.warn("Receipt backfill failed", { txnId: r.id, err: stripeErrMsg(e) });
        }
      })
    );

    const invoices = rows.map((r) => ({
      id: r.id,
      date: formatDate(r.createdAt),
      credits: r.delta,
      amount: formatMoney(r.amountCents, r.currency),
      hostedUrl: r.stripeInvoiceHostedUrl ?? null,
      pdfUrl: r.stripeInvoicePdfUrl ?? null,
      number: r.stripeInvoiceNumber ?? null,
      status: r.stripeInvoiceStatus ?? null,
      receiptUrl: (r as any).stripeReceiptUrl ?? null,
    }));

    return NextResponse.json({ invoices });
  } catch (e) {
    console.error("INVOICES API ERROR:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}