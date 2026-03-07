// src/app/api/billing/checkout/confirm/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // ✅ expand invoice so we can get hosted_invoice_url/pdf if available
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["invoice", "payment_intent"],
    });

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Session not paid yet" }, { status: 400 });
    }

    const walletIdRaw = session.metadata?.walletId;
    const creditsRaw = session.metadata?.credits;

    if (!walletIdRaw || !creditsRaw) {
      return NextResponse.json({ error: "Missing metadata on session" }, { status: 400 });
    }

    const walletId = Number(walletIdRaw);
    const credits = parseInt(creditsRaw, 10);

    if (!Number.isFinite(walletId) || walletId <= 0 || !Number.isFinite(credits) || credits <= 0) {
      return NextResponse.json({ error: "Invalid walletId or credits" }, { status: 400 });
    }

    const stripePaymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const stripeInvoiceId =
      typeof session.invoice === "string" ? session.invoice : session.invoice?.id ?? null;

    const stripeInvoiceHostedUrl =
      typeof session.invoice === "object" && session.invoice
        ? (session.invoice.hosted_invoice_url ?? null)
        : null;

    const stripeInvoicePdfUrl =
      typeof session.invoice === "object" && session.invoice
        ? (session.invoice.invoice_pdf ?? null)
        : null;

    // ✅ Basic ownership check: make sure this wallet exists and (if possible) matches session.customer
    const wallet = await prisma.creditWallet.findUnique({
      where: { id: walletId },
      select: { id: true },
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const billingProfile = await prisma.billingProfile.findUnique({
      where: { walletId },
      select: { stripeCustomerId: true },
    });

    // If we have a Stripe customer id stored, enforce it matches the session's customer
    const sessionCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    if (billingProfile?.stripeCustomerId && sessionCustomerId && billingProfile.stripeCustomerId !== sessionCustomerId) {
      return NextResponse.json({ error: "Session does not belong to this wallet" }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Lock wallet row (prevents concurrent double-increment)
      await tx.$queryRaw`SELECT id FROM credit_wallets WHERE id = ${walletId} FOR UPDATE`;

      const existing = await tx.creditTransaction.findFirst({
        where: { stripeCheckoutSessionId: session.id },
        select: { id: true },
      });

      if (existing) {
        return { ok: true, alreadyCredited: true as const };
      }

      await tx.creditTransaction.create({
        data: {
          walletId,
          type: "topup",
          source: "stripe",
          delta: credits,
          description: `Stripe Checkout top-up (${credits} credits)`,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId,
          stripeInvoiceId,

          // ✅ optional: store urls if you add these columns
          // stripeInvoiceHostedUrl,
          // stripeInvoicePdfUrl,
        },
      });

      await tx.creditWallet.update({
        where: { id: walletId },
        data: { balance: { increment: credits } },
      });

      return { ok: true, alreadyCredited: false as const };
    });

    return NextResponse.json({
      ...result,
      stripeInvoiceId,
      stripeInvoiceHostedUrl,
      stripeInvoicePdfUrl,
    });
  } catch (e: any) {
    console.error("CHECKOUT CONFIRM ERROR:", e);

    if (e?.code === "P2002") {
      return NextResponse.json({ ok: true, alreadyCredited: true });
    }

    return NextResponse.json({ error: "Failed to confirm checkout" }, { status: 500 });
  }
}