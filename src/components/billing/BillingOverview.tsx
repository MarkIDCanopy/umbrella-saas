// src/components/billing/BillingOverview.tsx
"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/app/(public)/dashboard/billing/page";

export type BillingProfileSummary = {
  type: "personal" | "company";
  name: string | null;
  email: string | null;
  country: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  taxId: string | null;
};

type Props = {
  hasPaymentMethod: boolean;
  creditsBalance: number;
  avgDailyUsage: number;
  estimatedDaysRemaining: number | null;
  hasCredits: boolean;
  hasInvoices: boolean;
  invoices: Invoice[];

  billingProfile: BillingProfileSummary | null;
  onAddBilling: () => void;
  onEditBilling: () => void;
};

export function BillingOverview({
  hasPaymentMethod,
  creditsBalance,
  avgDailyUsage,
  estimatedDaysRemaining,
  hasCredits,
  hasInvoices,
  invoices,
  billingProfile,
  onAddBilling,
  onEditBilling,
}: Props) {
  const billingCard = !hasPaymentMethod ? (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Billing details</CardTitle>
        <CardDescription>
          Set up your billing details so they appear on your invoices.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button onClick={onAddBilling}>Add billing details</Button>
        <p className="text-xs text-muted-foreground">
          You&apos;ll only be asked for payment when you buy credits.
        </p>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Billing details</CardTitle>
        <CardDescription>These details will appear on your invoices.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[1fr_9rem] gap-y-2 text-sm min-w-0">
          <span className="text-muted-foreground">Billing type</span>
          <span
            className="font-medium text-right truncate"
            title={billingProfile?.type === "company" ? "Company" : "Personal"}
          >
            {billingProfile?.type === "company" ? "Company" : "Personal"}
          </span>

          <span className="text-muted-foreground">
            {billingProfile?.type === "company" ? "Company name" : "Full name"}
          </span>
          <span className="font-medium text-right truncate" title={billingProfile?.name ?? ""}>
            {billingProfile?.name || "—"}
          </span>

          <span className="text-muted-foreground">Email</span>
          <span className="font-medium text-right truncate" title={billingProfile?.email ?? ""}>
            {billingProfile?.email || "—"}
          </span>

          <span className="text-muted-foreground">Country</span>
          <span className="font-medium text-right truncate" title={billingProfile?.country ?? ""}>
            {billingProfile?.country || "—"}
          </span>
        </div>

        <Button variant="outline" className="w-full justify-center" onClick={onEditBilling}>
          Edit billing details
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Current balance</CardTitle>
            <CardDescription>Credits available for API calls and verification jobs.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <div>
              <div className="text-4xl font-semibold tracking-tight">
                {creditsBalance.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">credits available</div>
            </div>
            <div className="space-y-1 text-right text-xs text-muted-foreground">
              <div>
                Avg. daily usage:{" "}
                <span className="font-medium text-foreground">{avgDailyUsage} credits</span>
              </div>
              <div>
                Estimated days remaining:{" "}
                {hasCredits && estimatedDaysRemaining !== null ? (
                  <span className="font-medium text-foreground">~{estimatedDaysRemaining} days</span>
                ) : (
                  <span className="font-medium text-foreground">buy credits to get started</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {billingCard}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent invoices</CardTitle>
          <CardDescription>Your billing history.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasInvoices ? (
            <p className="text-sm text-muted-foreground">
              No invoices yet. Once you buy credits, your invoices will appear here.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="px-4 py-2 text-left font-medium">Credits</th>
                    <th className="px-4 py-2 text-left font-medium">Amount</th>
                    <th className="px-4 py-2 text-right font-medium">Invoice</th>
                    <th className="px-4 py-2 text-right font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => {
                    const invoiceHref = inv.pdfUrl ?? inv.hostedUrl ?? null;
                    const receiptHref = inv.receiptUrl ?? inv.hostedUrl ?? null;

                    return (
                      <tr
                        key={inv.id}
                        className={cn("border-t", idx % 2 === 1 && "bg-muted/40")}
                      >
                        <td className="px-4 py-2">{inv.date}</td>
                        <td className="px-4 py-2">{inv.credits.toLocaleString()}</td>
                        <td className="px-4 py-2">{inv.amount}</td>

                        <td className="px-4 py-2 text-right">
                          {invoiceHref ? (
                            <a
                              className="text-xs text-primary hover:underline"
                              href={invoiceHref}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Download
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="px-4 py-2 text-right">
                          {receiptHref ? (
                            <a
                              className="text-xs text-primary hover:underline"
                              href={receiptHref}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}