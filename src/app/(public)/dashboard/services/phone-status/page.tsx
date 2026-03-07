// src/app/(public)/dashboard/services/phone-status/page.tsx
"use client";

import { useState, useEffect } from "react";
import { ServiceHeader } from "@/components/service-layout/ServiceHeader";
import { EnvironmentToggle } from "@/components/service-layout/EnvironmentToggle";
import {
  ExecutionModeToggle,
  type ExecutionMode,
} from "@/components/service-layout/ExecutionModeToggle";
import { BulkRequestForm } from "@/components/service-layout/BulkRequestForm";
import { TransactionList } from "@/components/transactions/TransactionList";
import type { Transaction } from "@/lib/transactions/types";

import {
  PhoneStatusInputPanel,
  type PhoneStatusPayload,
} from "./InputPanel";
import {
  PhoneStatusOutputPanel,
  type PhoneStatusResponse,
} from "./OutputPanel";

import { useUser } from "@/context/UserContext";

const SERVICE_KEY = "phone-status";

const PHONE_BULK_JSON_EXAMPLE = `[
  { "phoneNumber": "+4915123456789" },
  { "phoneNumber": "+436601234567" }
]`;

export default function PhoneStatusPage() {
  const [environment, setEnvironment] = useState<"test" | "live">("live");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("single");

  const [response, setResponse] = useState<PhoneStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // BULK STATE
  const [bulkBatchId, setBulkBatchId] = useState<string | null>(null);
  const [bulkSubmitted, setBulkSubmitted] = useState(false);
  const [bulkTrx, setBulkTrx] = useState<Transaction[]>([]);

  const { refreshCredits } = useUser();

  const primaryActionClass =
    "mt-4 inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90";

  // RESET ON ENV CHANGE
  useEffect(() => {
    setResponse(null);
    setError(null);
    setIsSubmitting(false);
    setBulkSubmitted(false);
    setBulkBatchId(null);
    setBulkTrx([]);

    if (environment === "test") {
      setExecutionMode("single");
    }
  }, [environment]);

  // FETCH BULK RESULTS
  useEffect(() => {
    if (
      environment !== "live" ||
      executionMode !== "bulk" ||
      !bulkSubmitted ||
      !bulkBatchId
    ) {
      return;
    }

    const params = new URLSearchParams({
      page: "1",
      pageSize: "25",
      service: SERVICE_KEY,
      batchId: bulkBatchId,
    });

    fetch(`/api/transactions?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setBulkTrx(d.results ?? []))
      .catch(() => setBulkTrx([]));
  }, [environment, executionMode, bulkSubmitted, bulkBatchId]);

  // SINGLE SUBMIT
  async function handleSubmit(payload: PhoneStatusPayload) {
    setError(null);

    // TEST MODE
    if (environment === "test") {
      setResponse({
        referenceId: "TEST-REF-123",
        status: {
          code: 300,
          description: "Transaction successfully completed",
          updatedOn: new Date().toISOString(),
        },
        phoneType: "MOBILE",
        carrier: "Example Carrier",
        subscriberStatus: "ACTIVE",
        deviceStatus: "REACHABLE",
        roaming: "UNAVAILABLE",
        location: {
          country: "Germany",
          city: "Berlin",
        },
      });
      return;
    }

    // LIVE MODE
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/services/phone-status/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error ?? data?.providerError ?? "Phone status check failed"
        );
      }

      setResponse(data);
      await refreshCredits(); // ✅ update current workspace balance
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Phone status check failed");
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
        title="Phone Status Check"
        description="Check whether a phone number is active, reachable, or roaming."
        badge="Phone"
      />

      <EnvironmentToggle
        mode={environment}
        setMode={setEnvironment}
        fromCost={1}
        cost={1}
      />

      {environment === "live" && (
        <ExecutionModeToggle mode={executionMode} setMode={setExecutionMode} />
      )}

      {/* TEST MODE */}
      {environment === "test" && (
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <PhoneStatusInputPanel
            mode="test"
            onSubmit={handleSubmit}
            loading={isSubmitting}
          />
          <PhoneStatusOutputPanel mode="test" response={response} error={error} />
        </div>
      )}

      {/* LIVE SINGLE */}
      {environment === "live" && executionMode === "single" && (
        <>
          {!response && (
            <PhoneStatusInputPanel
              mode="live"
              onSubmit={handleSubmit}
              loading={isSubmitting}
            />
          )}

          {response && (
            <>
              <PhoneStatusOutputPanel mode="live" response={response} error={error} />
              <button onClick={resetToInput} className={primaryActionClass}>
                Run another check
              </button>
            </>
          )}
        </>
      )}

      {/* LIVE BULK */}
      {environment === "live" && executionMode === "bulk" && (
        <>
          {!bulkSubmitted && (
            <BulkRequestForm
              pricePerRequest={1}
              endpoint="/api/services/phone-status/bulk"
              jsonExample={PHONE_BULK_JSON_EXAMPLE}
              validateItem={(i) => typeof i?.phoneNumber === "string"}
              onCompleted={async (batchId) => {
                setBulkBatchId(batchId);
                setBulkSubmitted(true);
                await refreshCredits(); // ✅ bulk charges credits too
              }}
            />
          )}

          {bulkSubmitted && (
            <>
              <TransactionList transactions={bulkTrx} />
              <button onClick={resetToInput} className={primaryActionClass}>
                Run another check
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
    </div>
  );
}
