import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getBillingContext } from "@/lib/billing/context";
import { getOrCreateWallet } from "@/lib/billing/wallet";

export const runtime = "nodejs";

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

    const billingProfile = await prisma.billingProfile.findUnique({
      where: { walletId: wallet.id },
      select: {
        id: true,
        billingType: true,
        stripeCustomerId: true,
        email: true,
        fullName: true,
        companyName: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        postalCode: true,
        country: true,
        vatNumber: true,
      },
    });

    if (!billingProfile) {
      return NextResponse.json({ walletId: wallet.id, billingProfile: null });
    }

    let stripeCustomer: any = null;
    if (billingProfile.stripeCustomerId) {
      try {
        const c = await stripe.customers.retrieve(billingProfile.stripeCustomerId);
        stripeCustomer = {
          id: (c as any).id,
          name: (c as any).name ?? null,
          email: (c as any).email ?? null,
          address: (c as any).address ?? null,
        };
      } catch (e: any) {
        stripeCustomer = { error: e?.message ?? String(e) };
      }
    }

    // show last 5 invoices for this customer and their customer_details.address
    let recentInvoices: any[] = [];
    if (billingProfile.stripeCustomerId) {
      try {
        const list = await stripe.invoices.list({
          customer: billingProfile.stripeCustomerId,
          limit: 5,
        });

        recentInvoices = list.data.map((inv) => ({
          id: inv.id,
          status: inv.status,
          collection_method: (inv as any).collection_method,
          amount_paid: (inv as any).amount_paid,
          amount_due: (inv as any).amount_due,
          customer_details: (inv as any).customer_details ?? null,
          hosted_invoice_url: inv.hosted_invoice_url ?? null,
          invoice_pdf: inv.invoice_pdf ?? null,
        }));
      } catch (e: any) {
        recentInvoices = [{ error: e?.message ?? String(e) }];
      }
    }

    return NextResponse.json({
      context: ctx.kind,
      walletId: wallet.id,
      billingProfile,
      stripeCustomer,
      recentInvoices,
    });
  } catch (e) {
    console.error("BILLING DEBUG ERROR:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}