// src/components/service-layout/BulkRequestForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  pricePerRequest: number;
  getItemCostCredits?: (item: any) => number;
  pricingServiceKey?: string;

  costLabelPrefix?: string;
  costHint?: string;

  endpoint: string;
  jsonExample: string;
  validateItem: (item: any) => boolean;
  onCompleted: (batchId: string) => void;

  bulkConsentLabel?: string;
  bulkConsentChecked?: boolean;
  onBulkConsentChange?: (checked: boolean) => void;
  transformItemsBeforeSubmit?: (items: any[]) => any[];
}

function normalizeCountry(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

export function BulkRequestForm({
  pricePerRequest,
  getItemCostCredits,
  pricingServiceKey,
  costLabelPrefix = "Estimated cost",
  costHint,
  endpoint,
  jsonExample,
  validateItem,
  onCompleted,
  bulkConsentLabel,
  bulkConsentChecked = false,
  onBulkConsentChange,
  transformItemsBeforeSubmit,
}: Props) {
  const [jsonText, setJsonText] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);

  const [countryCredits, setCountryCredits] = useState<Record<string, number>>(
    {}
  );
  const [pricingLoading, setPricingLoading] = useState(false);

  function validate(data: any): data is any[] {
    return Array.isArray(data) && data.every(validateItem);
  }

  function parse(raw: string) {
    setError(null);
    setItems(null);

    if (!raw.trim()) return;

    try {
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        setError("JSON must be an array.");
        return;
      }

      const prepared: any[] = (transformItemsBeforeSubmit
      ? transformItemsBeforeSubmit(parsed)
      : parsed) as any[];

      if (!validate(prepared)) {
        const invalidIndex = (prepared as any[]).findIndex((item: any): boolean => !validateItem(item));
        setError(
          invalidIndex >= 0
            ? `JSON structure does not match the required format at item ${invalidIndex + 1}.`
            : "JSON structure does not match the required format."
        );
        return;
      }

      setItems(prepared);
    } catch {
      setError("Invalid JSON syntax.");
    }
  }

  useEffect(() => {
    if (!jsonText.trim()) {
      setItems(null);
      setError(null);
      return;
    }

    parse(jsonText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkConsentChecked]);

  useEffect(() => {
    if (!pricingServiceKey) return;

    if (!items?.length) {
      setCountryCredits({});
      return;
    }

    const countries = Array.from(
      new Set(items.map((i) => normalizeCountry(i?.country)).filter(Boolean))
    );

    if (countries.length === 0) {
      setCountryCredits({});
      return;
    }

    let cancelled = false;

    (async () => {
      setPricingLoading(true);
      try {
        const res = await fetch("/api/pricing/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            serviceKey: pricingServiceKey,
            countries,
          }),
        });

        const data = await res.json().catch(() => null);
        if (cancelled) return;

        if (!res.ok) {
          setCountryCredits({});
          console.error("Bulk pricing failed:", data?.error ?? res.statusText);
          return;
        }

        setCountryCredits(
          data?.prices && typeof data.prices === "object" ? data.prices : {}
        );
      } catch {
        if (!cancelled) setCountryCredits({});
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items, pricingServiceKey]);

  const cost = useMemo(() => {
    if (!items?.length) return null;

    if (pricingServiceKey) {
      const perItem = items.map((i) => {
        const cc = normalizeCountry(i?.country);
        const v = Number(countryCredits?.[cc]);
        return Number.isFinite(v) && v > 0 ? v : pricePerRequest;
      });
      const total = perItem.reduce((a, b) => a + b, 0);
      return { total, perItem };
    }

    if (getItemCostCredits) {
      const perItem = items.map((i) => {
        const v = Number(getItemCostCredits(i));
        return Number.isFinite(v) && v > 0 ? v : pricePerRequest;
      });
      const total = perItem.reduce((a, b) => a + b, 0);
      return { total, perItem };
    }

    return {
      total: items.length * pricePerRequest,
      perItem: null as number[] | null,
    };
  }, [
    items,
    pricingServiceKey,
    countryCredits,
    getItemCostCredits,
    pricePerRequest,
  ]);

  async function send() {
    if (!items?.length) return;

    setSending(true);
    setError(null);

    try {
      const preparedItems: any[] = transformItemsBeforeSubmit
      ? transformItemsBeforeSubmit(items)
      : items;

      const invalidIndex = preparedItems.findIndex(
        (item) => !validateItem(item)
      );

      if (invalidIndex !== -1) {
        throw new Error(
          `One or more items are invalid. Check item ${invalidIndex + 1}.`
        );
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: preparedItems }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Bulk request failed");

      const { batchId } = data ?? {};
      if (!batchId) throw new Error("Missing batchId in response");

      onCompleted(batchId);

      setJsonText("");
      setItems(null);
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Bulk request failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-sm">
        <p className="font-medium">Bulk requests</p>
        <p className="text-muted-foreground">
          Submit multiple requests at once using a JSON array or file upload.
          Each entry is processed and charged individually.
        </p>

        <p className="text-amber-700">⚠️ Pricing is applied per request.</p>

        {pricingServiceKey && items?.length ? (
          <p className="text-xs text-muted-foreground">
            {pricingLoading ? "Loading country pricing…" : "Country pricing loaded."}
          </p>
        ) : null}
      </div>

      <Collapsible open={exampleOpen} onOpenChange={setExampleOpen}>
        <div className="rounded-lg border bg-muted">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-medium">Expected JSON format</p>

            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-label={exampleOpen ? "Hide JSON example" : "Show JSON example"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted/60"
              >
                {exampleOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="border-t px-4 py-3">
              <pre className="text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre">
                {jsonExample}
              </pre>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <Textarea
        rows={10}
        placeholder="Paste JSON array here"
        value={jsonText}
        onChange={(e) => {
          const v = e.target.value;
          setJsonText(v);
          parse(v);
        }}
      />

      <Input
        type="file"
        accept="application/json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          f.text().then((t) => {
            setJsonText(t);
            parse(t);
          });
        }}
      />

      {onBulkConsentChange && bulkConsentLabel ? (
        <label className="flex items-start gap-3 rounded-lg border bg-muted/20 px-3 py-3 text-sm">
          <input
            type="checkbox"
            checked={bulkConsentChecked}
            onChange={(e) => onBulkConsentChange(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>{bulkConsentLabel}</span>
        </label>
      ) : null}

      {items && <div className="text-sm">{items.length} requests</div>}

      {items && cost && (
        <div className="w-full space-y-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <div>
            <b>{costLabelPrefix}:</b>{" "}
            <span className="font-semibold">{cost.total} credits</span>
          </div>

          {typeof costHint === "string" && costHint.trim() && (
            <div className="text-amber-800/90">{costHint}</div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md border bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button disabled={!items || sending} onClick={send} className="w-full">
        {sending ? "Sending…" : "Send bulk requests"}
      </Button>
    </div>
  );
}