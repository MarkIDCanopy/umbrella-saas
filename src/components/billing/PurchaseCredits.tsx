// src/components/billing/PurchaseCredits.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CreditBundleId = "100" | "1000" | "10000" | "custom";

// ✅ keep min in sync with backend
const MIN_PURCHASE_CREDITS = 100;

// ✅ base price: 1 credit = €0.25
const PRICE_PER_CREDIT_EUR = 0.25;

// ✅ discount tiers (tiers apply to bundles AND custom)
function discountForCredits(credits: number): number {
  if (credits >= 10000) return 0.2; // 20% off
  if (credits >= 1000) return 0.1; // 10% off
  return 0;
}

function eur(n: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function clampInt(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

const CREDIT_BUNDLES: Array<{
  id: CreditBundleId;
  label: string;
  credits: number | null; // null for custom
  highlight?: "best" | "save";
}> = [
  { id: "100", label: "100 credits", credits: 100 },
  { id: "1000", label: "1,000 credits", credits: 1000, highlight: "best" },
  { id: "10000", label: "10,000 credits", credits: 10000, highlight: "save" },
  { id: "custom", label: "Custom amount", credits: null },
];

type Props = {
  hasPaymentMethod: boolean;
  canPurchase: boolean; // ✅ NEW
  purchaseDisabledReason?: string | null; // ✅ NEW (optional)
  onPurchase: (credits: number, price: number) => Promise<void>;
};

export function PurchaseCredits({
  hasPaymentMethod,
  canPurchase,
  purchaseDisabledReason,
  onPurchase,
}: Props) {
  const [selectedBundle, setSelectedBundle] = useState<CreditBundleId>("1000");
  const [customCredits, setCustomCredits] = useState("");

  const selectedBundleDef = useMemo(
    () => CREDIT_BUNDLES.find((b) => b.id === selectedBundle)!,
    [selectedBundle]
  );

  const effectiveCredits = useMemo(() => {
    const fromBundle = selectedBundleDef.credits;
    if (typeof fromBundle === "number") return fromBundle;

    const parsed = clampInt(parseInt(customCredits, 10));
    return parsed;
  }, [selectedBundleDef, customCredits]);

  const effectiveDiscount = useMemo(() => {
    return discountForCredits(effectiveCredits);
  }, [effectiveCredits]);

  const effectivePrice = useMemo(() => {
    if (!effectiveCredits) return 0;

    const base = effectiveCredits * PRICE_PER_CREDIT_EUR;
    return +(base * (1 - effectiveDiscount)).toFixed(2);
  }, [effectiveCredits, effectiveDiscount]);

  const perCreditPrice = effectiveCredits ? effectivePrice / effectiveCredits : 0;

  const formDisabled =
    !hasPaymentMethod ||
    !canPurchase ||
    !effectiveCredits ||
    effectiveCredits < MIN_PURCHASE_CREDITS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!hasPaymentMethod) return;
    if (!canPurchase) return;
    if (!effectiveCredits || effectiveCredits < MIN_PURCHASE_CREDITS) return;

    await onPurchase(effectiveCredits, effectivePrice);
  }

  const primaryDisabledLabel = !hasPaymentMethod
    ? "Add billing details first"
    : !canPurchase
    ? "Only admins/owners can purchase"
    : `Continue to payment – ${eur(effectivePrice)}`;

  return (
    <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
      {/* Bundles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Purchase credits</CardTitle>
          <CardDescription>
            Choose a bundle or enter a custom amount. Minimum purchase is{" "}
            {MIN_PURCHASE_CREDITS} credits.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Permission warning */}
          {!canPurchase && (
            <div className="rounded-xl border bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {purchaseDisabledReason ||
                "Only organization owners/admins can purchase credits in this organization."}
            </div>
          )}

          <div className={cn("space-y-3", !canPurchase && "opacity-60")}>
            {CREDIT_BUNDLES.filter((b) => b.id !== "custom").map((bundle) => {
              const isSelected = selectedBundle === bundle.id;
              const credits = bundle.credits ?? 0;

              const discount = discountForCredits(credits);
              const price = credits * PRICE_PER_CREDIT_EUR * (1 - discount);
              const pricePerCredit = credits ? price / credits : null;

              return (
                <button
                  key={bundle.id}
                  type="button"
                  disabled={!canPurchase}
                  onClick={() => {
                    if (!canPurchase) return;
                    setSelectedBundle(bundle.id);
                    setCustomCredits("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                    !canPurchase && "cursor-not-allowed",
                    isSelected
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border hover:bg-muted/60"
                  )}
                >
                  <div>
                    <div className="text-sm font-semibold">{bundle.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {eur(price)} ·{" "}
                      {pricePerCredit != null && `${eur(pricePerCredit)} per credit`}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-base font-semibold">{eur(price)}</span>

                    {bundle.highlight === "best" && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        Best value
                      </span>
                    )}

                    {bundle.highlight === "save" && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                        Save 20%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom amount */}
          <div className={cn("space-y-2", !canPurchase && "opacity-60")}>
            <Label>Or enter custom amount</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={MIN_PURCHASE_CREDITS}
                step={MIN_PURCHASE_CREDITS}
                placeholder="Enter credits"
                value={customCredits}
                disabled={!canPurchase}
                onChange={(e) => {
                  if (!canPurchase) return;
                  setCustomCredits(e.target.value);
                  setSelectedBundle("custom");
                }}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Base pricing: {eur(PRICE_PER_CREDIT_EUR)} per credit. Discounts apply at{" "}
              1,000+ credits (10%) and 10,000+ credits (20%). Minimum purchase:{" "}
              {MIN_PURCHASE_CREDITS} credits.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Button type="submit" className="w-full justify-center" disabled={formDisabled}>
              {primaryDisabledLabel}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              You’ll be redirected to Stripe to pay for your selected credits.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order summary</CardTitle>
          <CardDescription>
            Review your selection before continuing to Stripe.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Credits</span>
            <span className="font-medium">{effectiveCredits || 0} credits</span>
          </div>

          {effectiveDiscount > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Discount</span>
              <span>-{Math.round(effectiveDiscount * 100)}%</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Price</span>
            <span className="font-medium">{eur(effectivePrice)}</span>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground pt-2">
            <span>Per-credit price</span>
            <span>{effectiveCredits ? eur(perCreditPrice) : "–"}</span>
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            Billing rule: 1 credit = {eur(PRICE_PER_CREDIT_EUR)} before discounts.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}