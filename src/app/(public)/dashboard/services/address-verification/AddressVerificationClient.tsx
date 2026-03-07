// src/app/(public)/dashboard/services/address-verification/AddressVerificationClient.tsx
"use client";

import { useEffect, useState } from "react";
import { ServiceHeader } from "@/components/service-layout/ServiceHeader";
import { EnvironmentToggle } from "@/components/service-layout/EnvironmentToggle";
import {
  ExecutionModeToggle,
  type ExecutionMode,
} from "@/components/service-layout/ExecutionModeToggle";
import { BulkRequestForm } from "@/components/service-layout/BulkRequestForm";
import { AddressInputPanel, type AddressVerifyPayload } from "./InputPanel";
import { AddressOutputPanel, type AddressVerifyResponse } from "./OutputPanel";
import { TransactionList } from "@/components/transactions/TransactionList";
import type { Transaction } from "@/lib/transactions/types";
import { useUser } from "@/context/UserContext";

const ADDRESS_FROM_CREDITS = 4;
const SERVICE_KEY = "address-verification";

const ADDRESS_BULK_JSON_EXAMPLE = `[
  {
    "country": "PL",
    "address": {
      "street": "Doktora Jana Piltza",
      "number": "41",
      "zip": "30-392",
      "city": "Kraków",
      "province": ""
    },
    "identity": {
      "firstname": "Max",
      "lastname": "Mustermann",
      "dob": "2001/10/25"
    }
  },
  {
    "country": "DE",
    "address": {
      "street": "Invalidenstraße",
      "number": "116",
      "zip": "10115",
      "city": "Berlin",
      "province": ""
    },
    "identity": {
      "firstname": "Erika",
      "lastname": "Mustermann",
      "dob": "1995/06/10"
    }
  }
]`;

function normalizeCountry(country?: string) {
  return String(country ?? "").trim().toUpperCase();
}

type PriceUi = { kind: "from" | "cost"; credits: number };

async function readJsonOrText(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await res.json().catch(() => null);
  }
  const text = await res.text().catch(() => "");
  return text ? { error: text } : null;
}

export default function AddressVerificationClient() {
  const [bulkBatchId, setBulkBatchId] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<"test" | "live">("live");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("single");

  const [response, setResponse] = useState<AddressVerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bulkSubmitted, setBulkSubmitted] = useState(false);
  const [bulkTrx, setBulkTrx] = useState<Transaction[]>([]);

  const [country, setCountry] = useState<string>("");

  const { refreshCredits } = useUser();

  const [priceUi, setPriceUi] = useState<PriceUi>({
    kind: "from",
    credits: ADDRESS_FROM_CREDITS,
  });

  useEffect(() => {
    const cc = normalizeCountry(country);

    if (!cc) {
      setPriceUi({ kind: "from", credits: ADDRESS_FROM_CREDITS });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const params = new URLSearchParams({ key: SERVICE_KEY, country: cc });
        const res = await fetch(`/api/pricing/service?${params.toString()}`, {
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);
        if (cancelled) return;

        const credits = Number(data?.credits);
        if (res.ok && Number.isFinite(credits) && credits > 0) {
          setPriceUi({ kind: "cost", credits });
        } else {
          setPriceUi({ kind: "from", credits: ADDRESS_FROM_CREDITS });
        }
      } catch {
        if (!cancelled) {
          setPriceUi({ kind: "from", credits: ADDRESS_FROM_CREDITS });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [country]);

  useEffect(() => {
    setResponse(null);
    setError(null);
    setIsSubmitting(false);
    setBulkSubmitted(false);
    setBulkTrx([]);
    setBulkBatchId(null);

    if (environment === "test") setExecutionMode("single");
  }, [environment]);

  useEffect(() => {
    if (environment !== "live") return;
    if (executionMode !== "bulk") return;
    if (!bulkSubmitted || !bulkBatchId) return;

    const params = new URLSearchParams({
      page: "1",
      pageSize: "25",
      service: SERVICE_KEY,
      batchId: bulkBatchId,
    });

    fetch(`/api/transactions?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setBulkTrx(d.results ?? []))
      .catch(() => setBulkTrx([]));
  }, [environment, executionMode, bulkSubmitted, bulkBatchId]);

  async function handleSubmit(payload: AddressVerifyPayload) {
  setError(null);
  setResponse(null);
  setIsSubmitting(true);

  try {
    if (environment === "test") {
      await new Promise((r) => setTimeout(r, 400));

      const address = payload?.address ?? {};
      const identity = payload?.identity ?? {};

      const ok =
        payload?.country &&
        address?.street &&
        identity?.firstname;

      const inputAddress = [
        address.street ?? "",
        address.number ?? "",
        address.zip ?? "",
        address.city ?? "",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      const correctedAddress = [
        [address.street ?? "", address.number ?? ""].filter(Boolean).join(" "),
        [address.zip ?? "", address.city ?? ""].filter(Boolean).join(" "),
        payload?.country ?? "",
      ]
        .filter(Boolean)
        .join(", ")
        .trim();

      const finalAddress = [
        address.street ?? "",
        address.number ?? "",
        address.zip ?? "",
        address.city ?? "",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      setResponse({
        inputAddress,
        correctedAddress,
        finalAddress,
        addressStatus: "unchanged",
        matchQuality: ok ? "EXACT" : "NO_MATCH",
        score: ok ? 100 : 0,
        globalResult: {
          overall: ok ? "OK" : "NOK",
          totalScore: ok ? 100 : 0,
        },
        identity: {
          fullName: `${identity.firstname ?? ""} ${identity.lastname ?? ""}`.trim(),
          dob: identity.dob ?? "",
        },
        extendedMessage: ok ? "addressFound" : "noMatch",
        timestamp: new Date().toISOString().replace("T", " ").split(".")[0],
      });

      return;
    }

    const res = await fetch("/api/services/address-verify/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, environment: "live" }),
    });

    const data = await readJsonOrText(res);

    if (!res.ok) {
      throw new Error(
        data?.providerError ??
          data?.error ??
          `Verification failed (${res.status})`
      );
    }

    setResponse(data as AddressVerifyResponse);
    await refreshCredits();
  } catch (e: any) {
    setError(typeof e?.message === "string" ? e.message : "Verification failed");
  } finally {
    setIsSubmitting(false);
  }
}

  function resetToInput() {
    setResponse(null);
    setBulkSubmitted(false);
    setBulkBatchId(null);
    setBulkTrx([]);
    setError(null);
    setIsSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <ServiceHeader
        title="Address Verification"
        description="Verify a person at an address."
        badge="Verification"
      />

      <EnvironmentToggle
        mode={environment}
        setMode={setEnvironment}
        fromCost={ADDRESS_FROM_CREDITS}
      />

      {environment === "live" && (
        <ExecutionModeToggle mode={executionMode} setMode={setExecutionMode} />
      )}

      {environment === "test" && (
        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <AddressInputPanel
            mode="test"
            onSubmit={handleSubmit}
            onCountryChange={setCountry}
            buttonCostCredits={priceUi.credits}
            buttonCostLabelPrefix={priceUi.kind === "cost" ? "Cost" : "From"}
          />
          <AddressOutputPanel mode="test" response={response} error={error} />
        </div>
      )}

      {environment === "live" && executionMode === "single" && (
        <>
          {!response && (
            <AddressInputPanel
              mode="live"
              onSubmit={handleSubmit}
              onCountryChange={setCountry}
              buttonCostCredits={priceUi.credits}
              buttonCostLabelPrefix={priceUi.kind === "cost" ? "Cost" : "From"}
            />
          )}

          {response && (
            <>
              <AddressOutputPanel mode="live" response={response} error={error} />
              <button
                onClick={resetToInput}
                className="mt-4 inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90"
              >
                Run another verification
              </button>
            </>
          )}
        </>
      )}

      {environment === "live" && executionMode === "bulk" && (
        <>
          {!bulkSubmitted && (
            <BulkRequestForm
              pricePerRequest={ADDRESS_FROM_CREDITS}
              pricingServiceKey={SERVICE_KEY}
              costLabelPrefix="Estimated cost"
              costHint="Calculated from each item's country (from DB)."
              endpoint="/api/services/address-verify/bulk"
              jsonExample={ADDRESS_BULK_JSON_EXAMPLE}
              validateItem={(i) =>
                typeof i?.country === "string" &&
                typeof i?.address?.street === "string" &&
                typeof i?.address?.number === "string" &&
                typeof i?.address?.zip === "string" &&
                typeof i?.address?.city === "string" &&
                typeof i?.identity?.firstname === "string" &&
                typeof i?.identity?.lastname === "string"
              }
              onCompleted={async (batchId) => {
                setBulkBatchId(batchId);
                setBulkSubmitted(true);
                await refreshCredits();
              }}
            />
          )}

          {bulkSubmitted && (
            <>
              <TransactionList transactions={bulkTrx} />
              <button
                onClick={resetToInput}
                className="mt-4 inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90"
              >
                Run another verification
              </button>
            </>
          )}
        </>
      )}

      {error && (
        <div className="rounded-md border bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {isSubmitting && (
        <div className="text-sm text-muted-foreground">
          {environment === "test" ? "Running test…" : "Submitting…"}
        </div>
      )}
    </div>
  );
}