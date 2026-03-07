// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function readRawBody(req: Request) {
  const ab = await req.arrayBuffer();
  return Buffer.from(ab);
}

function stripeErrMsg(e: any) {
  return e?.raw?.message || e?.message || String(e);
}

export async function POST(req: Request) {
  try {
    if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not set" }, { status: 500 });
    }

    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

    const rawBody = await readRawBody(req);

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (e: any) {
      console.error("WEBHOOK SIGNATURE ERROR:", stripeErrMsg(e));
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // ------------------------------------------------------------
    // 1) Charge updates (receipt_url often arrives here)
    // ------------------------------------------------------------
    if (event.type === "charge.updated" || event.type === "charge.succeeded") {
    const charge = event.data.object as any;

    const receiptUrl: string | null = charge?.receipt_url ?? null;
    const chargeId: string | null = charge?.id ?? null;
    const paymentIntentId: string | null = charge?.payment_intent ?? null;

    if (!chargeId && !paymentIntentId) {
        return NextResponse.json({ ok: true, ignored: true });
    }

    const updated = await prisma.creditTransaction.updateMany({
        where: {
        OR: [
            chargeId ? { stripeChargeId: chargeId } : undefined,
            paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : undefined,
        ].filter(Boolean) as any,
        },
        data: {
        stripeChargeId: chargeId ?? undefined,
        stripePaymentIntentId: paymentIntentId ?? undefined,
        ...(receiptUrl ? { stripeReceiptUrl: receiptUrl } : {}),
        },
    });

    return NextResponse.json({ ok: true, updatedCount: updated.count, hasReceiptUrl: !!receiptUrl });
    }

    // ------------------------------------------------------------
    // 2) Checkout session completed (crediting + invoice storage)
    // ------------------------------------------------------------
    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ ok: true });
    }

    // ✅ Optional dedupe: only for checkout.session.completed
    const already = await prisma.creditTransaction.findFirst({
      where: { stripeEventId: event.id },
      select: { id: true },
    });
    if (already) return NextResponse.json({ ok: true, deduped: true });

    const session = event.data.object as any;
    if (session.payment_status !== "paid") return NextResponse.json({ ok: true, ignored: true });

    const walletIdRaw = session?.metadata?.walletId;
    const creditsRaw = session?.metadata?.credits;
    if (!walletIdRaw || !creditsRaw) return NextResponse.json({ ok: true, ignored: true });

    const walletId = Number(walletIdRaw);
    const credits = parseInt(String(creditsRaw), 10);
    if (!Number.isFinite(walletId) || walletId <= 0 || !Number.isFinite(credits) || credits <= 0) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const checkoutSessionId = String(session.id);

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const invoiceId =
      typeof session.invoice === "string" ? session.invoice : session.invoice?.id ?? null;

    // Try best-effort receipt now (might still be null; charge.updated will fill later)
    let receiptUrl: string | null = null;
    let chargeId: string | null = null;

    if (paymentIntentId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["charges"] });
        const ch = (pi as any)?.charges?.data?.[0] ?? null;
        receiptUrl = ch?.receipt_url ?? null;
        chargeId = ch?.id ?? null;
      } catch (e: any) {
        console.warn("RECEIPT FETCH (checkout) FAILED:", stripeErrMsg(e));
      }
    }

    // Invoice URLs + amount/currency/status
    let hostedUrl: string | null = null;
    let pdfUrl: string | null = null;
    let amountCents: number | null = null;
    let currency: string | null = null;
    let invoiceNumber: string | null = null;
    let invoiceStatus: string | null = null;

    if (invoiceId) {
      try {
        const inv: any = await stripe.invoices.retrieve(invoiceId);
        hostedUrl = inv.hosted_invoice_url ?? null;
        pdfUrl = inv.invoice_pdf ?? null;

        amountCents =
          typeof inv.amount_paid === "number" && inv.amount_paid > 0
            ? inv.amount_paid
            : typeof inv.amount_due === "number"
            ? inv.amount_due
            : null;

        currency = inv.currency ?? null;
        invoiceNumber = inv.number ?? null;
        invoiceStatus = inv.status ?? null;
      } catch (e: any) {
        console.warn("INVOICE RETRIEVE FAILED:", stripeErrMsg(e));
      }
    }

    // Create OR update transaction idempotently
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM credit_wallets WHERE id = ${walletId} FOR UPDATE`;

      const existing = await tx.creditTransaction.findFirst({
        where: { stripeCheckoutSessionId: checkoutSessionId },
        select: { id: true },
      });

      if (existing) {
        await tx.creditTransaction.update({
          where: { id: existing.id },
          data: {
            // keep stripeEventId for dedupe
            stripeEventId: event.id,
            stripePaymentIntentId: paymentIntentId ?? undefined,
            stripeInvoiceId: invoiceId ?? undefined,

            stripeInvoiceHostedUrl: hostedUrl ?? undefined,
            stripeInvoicePdfUrl: pdfUrl ?? undefined,
            amountCents: amountCents ?? undefined,
            currency: currency ?? undefined,
            stripeInvoiceNumber: invoiceNumber ?? undefined,
            stripeInvoiceStatus: invoiceStatus ?? undefined,

            stripeReceiptUrl: receiptUrl ?? undefined,
            stripeChargeId: chargeId ?? undefined,
          },
        });

        return { ok: true, alreadyCredited: true as const, updated: true as const };
      }

      await tx.creditTransaction.create({
        data: {
          walletId,
          type: "topup",
          source: "stripe",
          delta: credits,
          description: `Stripe Checkout top-up (${credits} credits)`,

          stripeEventId: event.id,
          stripeCheckoutSessionId: checkoutSessionId,
          stripePaymentIntentId: paymentIntentId,
          stripeInvoiceId: invoiceId,

          stripeInvoiceHostedUrl: hostedUrl,
          stripeInvoicePdfUrl: pdfUrl,
          amountCents: amountCents ?? undefined,
          currency: currency ?? undefined,
          stripeInvoiceNumber: invoiceNumber ?? undefined,
          stripeInvoiceStatus: invoiceStatus ?? undefined,

          stripeReceiptUrl: receiptUrl ?? undefined,
          stripeChargeId: chargeId ?? undefined,
        },
      });

      await tx.creditWallet.update({
        where: { id: walletId },
        data: { balance: { increment: credits } },
      });

      return { ok: true, alreadyCredited: false as const, updated: false as const };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("WEBHOOK ERROR:", stripeErrMsg(e), e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}