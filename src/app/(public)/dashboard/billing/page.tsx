// src/app/(public)/dashboard/billing/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BillingOverview,
  type BillingProfileSummary,
} from "@/components/billing/BillingOverview";
import { PurchaseCredits } from "@/components/billing/PurchaseCredits";
import { BillingSetupForm } from "@/components/billing/BillingSetupForm";
import type { BillingMode } from "@/components/billing/BillingModeToggle";
import { useUser } from "@/context/UserContext";

export type Invoice = {
  id: string;
  date: string;
  credits: number;
  amount: string;
  hostedUrl: string | null;
  pdfUrl: string | null;
  number?: string | null;
  status?: string | null;
  receiptUrl: string | null;
};

type BillingContext = "personal" | "org";
type OrgRole = "owner" | "admin" | "user" | "viewer" | "personal" | null;

export default function BillingPage() {
  const searchParams = useSearchParams();
  const { refreshCredits, refreshUser } = useUser();

  const [mode, setMode] = useState<BillingMode>("personal");
  const [billingContext, setBillingContext] = useState<BillingContext>("personal");

  const [hasBillingProfile, setHasBillingProfile] = useState(false);
  const [billingProfile, setBillingProfile] = useState<BillingProfileSummary | null>(null);

  const [creditsBalance, setCreditsBalance] = useState(0);
  const [avgDailyUsage] = useState(82);
  const [showSetupForm, setShowSetupForm] = useState(false);

  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [orgRole, setOrgRole] = useState<OrgRole>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  // guards
  const didConfirmRef = useRef(false);
  const confirmInFlightRef = useRef(false);
  const summaryCoreInFlightRef = useRef(false);
  const invoicesInFlightRef = useRef(false);

  const estimatedDaysRemaining = useMemo(() => {
    if (!creditsBalance || !avgDailyUsage) return null;
    return Math.floor(creditsBalance / avgDailyUsage);
  }, [creditsBalance, avgDailyUsage]);

  const hasCredits = creditsBalance > 0;
  const hasInvoices = invoices.length > 0;

  async function loadOrgRoleIfNeeded(nextCtx?: BillingContext) {
    const ctx = nextCtx ?? billingContext;

    // avoid extra request
    if (ctx !== "org") {
      if (orgRole !== "personal") setOrgRole("personal");
      return;
    }

    // avoid refetch if we already have a role (and not currently loading)
    if (orgRole && orgRole !== "personal") return;

    setRoleLoading(true);
    try {
      const res = await fetch("/api/organizations/current/role", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setOrgRole((data?.role ?? null) as OrgRole);
    } catch {
      setOrgRole(null);
    } finally {
      setRoleLoading(false);
    }
  }

  async function loadInvoices() {
    if (invoicesInFlightRef.current) return;
    invoicesInFlightRef.current = true;

    try {
      const res = await fetch("/api/billing/invoices", { cache: "no-store" });
      if (!res.ok) {
        setInvoices([]);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setInvoices((data?.invoices ?? []) as Invoice[]);
    } catch (e) {
      console.error("Failed to load invoices", e);
      setInvoices([]);
    } finally {
      invoicesInFlightRef.current = false;
    }
  }

  // ✅ fast summary loader (NO invoices)
  async function loadSummaryCore(): Promise<number | null> {
    if (summaryCoreInFlightRef.current) return null;
    summaryCoreInFlightRef.current = true;

    try {
      const res = await fetch("/api/billing/summary", { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));

      const nextCtx: BillingContext = data.context === "org" ? "org" : "personal";

      // only set state when it changes
      setBillingContext((prev) => (prev === nextCtx ? prev : nextCtx));
      if (nextCtx === "org") setMode("company");

      await loadOrgRoleIfNeeded(nextCtx);

      const nextBalance = data.balance ?? 0;
      setCreditsBalance(nextBalance);

      if (data.billingProfile) {
        setBillingProfile(data.billingProfile as BillingProfileSummary);
        setHasBillingProfile(true);
      } else {
        setBillingProfile(null);
        setHasBillingProfile(false);
      }

      return nextBalance;
    } catch (e) {
      console.error("Failed to load billing summary", e);
      return null;
    } finally {
      summaryCoreInFlightRef.current = false;
    }
  }

  // ✅ normal load: summary + invoices (invoices separate so balance updates are fast)
  async function loadSummaryAndInvoices() {
    await loadSummaryCore();
    await loadInvoices();
  }

  useEffect(() => {
    loadSummaryAndInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ After returning from Stripe: confirm, then poll ONLY summary until balance updates, then load invoices once
  useEffect(() => {
    if (didConfirmRef.current) return;

    const status = searchParams.get("status");
    const sessionId = searchParams.get("session_id");

    if (status !== "success" || !sessionId) return;
    if (confirmInFlightRef.current) return;

    didConfirmRef.current = true;
    confirmInFlightRef.current = true;

    (async () => {
      const prevBalance = creditsBalance;

      try {
        await fetch(`/api/billing/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`, {
          method: "POST",
        }).catch(() => {});

        const maxTries = 10;
        for (let i = 0; i < maxTries; i++) {
          const nextBalance = await loadSummaryCore();
          if (nextBalance !== null && nextBalance !== prevBalance) break;
          await new Promise((r) => setTimeout(r, 600));
        }

        // refresh invoices once at the end (avoid slow backfills during polling)
        await loadInvoices();

        await refreshCredits();
        await refreshUser();
      } catch (e) {
        console.error("Failed to confirm checkout", e);
      } finally {
        confirmInFlightRef.current = false;

        const url = new URL(window.location.href);
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", url.toString());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleStartBillingSetup() {
    setShowSetupForm(true);
  }

  async function handleBillingSetupComplete() {
    setShowSetupForm(false);
    await loadSummaryAndInvoices();
    await refreshCredits();
    await refreshUser();
  }

  function handleBillingSetupCancel() {
    setShowSetupForm(false);
  }

  async function handlePurchaseCredits(credits: number, _price: number) {
    if (!hasBillingProfile) return;

    if (billingContext === "org" && !["owner", "admin"].includes(String(orgRole))) {
      console.error("Checkout blocked: insufficient permissions", { orgRole });
      return;
    }

    const MIN_PURCHASE_CREDITS = 100;
    if (!credits || credits < MIN_PURCHASE_CREDITS) return;

    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credits }),
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text().catch(() => "");

      let parsed: any = null;
      if (contentType.includes("application/json") && raw) {
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
      }

      console.error("Checkout failed", { status: res.status, contentType, raw, parsed });
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (data?.url) window.location.href = data.url;
  }

  const header = (
    <div className="flex flex-col gap-1">
      <h1 className="text-3xl font-semibold tracking-tight">Billing &amp; Credits</h1>
      <p className="text-sm text-muted-foreground">
        Manage your credit balance, billing details, and purchase history.
      </p>
    </div>
  );

  const isOrgContext = billingContext === "org";
  const canPurchase = !isOrgContext || ["owner", "admin"].includes(String(orgRole));
  const purchaseDisabledReason =
    isOrgContext && !canPurchase
      ? "Only organization owners/admins can purchase credits for this organization."
      : null;

  if (showSetupForm) {
    return (
      <div className="space-y-6">
        {header}
        <BillingSetupForm
          mode={mode}
          onModeChange={setMode}
          onCancel={handleBillingSetupCancel}
          onComplete={handleBillingSetupComplete}
          isOrgContext={isOrgContext}
          initialBilling={billingProfile}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="purchase">
            Purchase credits{roleLoading && isOrgContext ? "…" : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <BillingOverview
            hasPaymentMethod={hasBillingProfile}
            creditsBalance={creditsBalance}
            avgDailyUsage={avgDailyUsage}
            estimatedDaysRemaining={estimatedDaysRemaining}
            hasCredits={hasCredits}
            hasInvoices={hasInvoices}
            invoices={invoices}
            billingProfile={billingProfile}
            onAddBilling={handleStartBillingSetup}
            onEditBilling={handleStartBillingSetup}
          />
        </TabsContent>

        <TabsContent value="purchase" className="space-y-4">
          <PurchaseCredits
            hasPaymentMethod={hasBillingProfile}
            canPurchase={canPurchase && !roleLoading}
            purchaseDisabledReason={
              roleLoading && isOrgContext
                ? "Checking your organization permissions…"
                : purchaseDisabledReason
            }
            onPurchase={handlePurchaseCredits}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}