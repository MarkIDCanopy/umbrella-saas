// src/app/(public)/dashboard/services/phone-risk/page.tsx
"use client";

import { useEffect, useState } from "react";
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
  PhoneRiskScoreInputPanel,
  type PhoneRiskScorePayload,
} from "./InputPanel";
import {
  PhoneRiskScoreOutputPanel,
  type PhoneRiskScoreResponse,
  type PhoneRiskRequest,
} from "./OutputPanel";

import { useUser } from "@/context/UserContext";

const SERVICE_KEY = "phone-risk";

const BULK_JSON_EXAMPLE = `[
  { "phoneNumber": "+436501234567", "emailAddress": "test@example.com" },
  { "phoneNumber": "+4915123456789" }
]`;

async function readJsonOrNull(res: Response) {
  return await res.json().catch(() => null);
}

export default function PhoneRiskPage() {
  const [environment, setEnvironment] = useState<"test" | "live">("live");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("single");

  const [response, setResponse] = useState<PhoneRiskScoreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ keep last request for Input Summary in output
  const [lastRequest, setLastRequest] = useState<PhoneRiskRequest | null>(null);

  // BULK STATE
  const [bulkBatchId, setBulkBatchId] = useState<string | null>(null);
  const [bulkSubmitted, setBulkSubmitted] = useState(false);
  const [bulkTrx, setBulkTrx] = useState<Transaction[]>([]);

  const { refreshCredits } = useUser();

  const primaryActionClass =
    "mt-4 inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90";

  useEffect(() => {
    setResponse(null);
    setError(null);
    setIsSubmitting(false);
    setBulkSubmitted(false);
    setBulkBatchId(null);
    setBulkTrx([]);
    setLastRequest(null);

    if (environment === "test") setExecutionMode("single");
  }, [environment]);

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

  async function handleSubmit(payload: PhoneRiskScorePayload) {
    setError(null);

    // ✅ store request for output "Input Summary"
    setLastRequest({
      phoneNumber: payload.phoneNumber,
      emailAddress: payload.emailAddress,
    });

    // TEST MODE (keep your local mock if you want)
    if (environment === "test") {
      setResponse({
        status: true,
        referenceId: "TEST-RISK-REF-123",
        externalId: null,
        statusInfo: {
          code: 300,
          description: "Transaction successfully completed",
          updatedOn: new Date().toISOString(),
        },
        phoneType: "MOBILE",
        carrier: "Test Carrier",
        location: { country: "Austria", iso2: "AT", city: "Vienna" },
        blocklisting: { blocked: false, description: "Not blocked" },
        risk: {
          score: 301,
          level: "medium-low",
          recommendation: "allow",
          interpretation: {
            band: "81–450",
            recommendation: "allow",
            explanation:
              "Significant confidence-building behavior observed on-network. Likely genuine activity patterns.",
          },
        },
        riskInsights: {
          category: ["Low activity: not enough signals to classify as risky or trustworthy."],
          a2p: [
            "Low long-term activity: low verification traffic over the past 90 days.",
            "No range activity: little/no activity for risky range (or not in risky range).",
          ],
          p2p: ["No P2P data analyzed. Cannot classify P2P behavior."],
          numberType: [],
          ip: [],
          email: payload.emailAddress ? ["Moderate short-term activity: expected level of activity for this email address over the last 24 hours."] : [],
        },
      });
      return;
    }

    // LIVE MODE
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/services/phone-risk/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readJsonOrNull(res);

      if (!res.ok) {
        throw new Error(
          data?.error ?? data?.providerError ?? "Phone Risk Score failed"
        );
      }

      setResponse(data);
      await refreshCredits();
    } catch (e: any) {
      setError(
        typeof e?.message === "string" ? e.message : "Phone Risk Score failed"
      );
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
    setLastRequest(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <ServiceHeader
        title="Phone Risk Score"
        description="Detect potentially fraudulent activity by scoring the transaction risk of a phone number."
        badge="Risk"
      />

      <EnvironmentToggle mode={environment} setMode={setEnvironment} fromCost={2} cost={2} />

      {environment === "live" && (
        <ExecutionModeToggle mode={executionMode} setMode={setExecutionMode} />
      )}

      {/* TEST */}
      {environment === "test" && (
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <PhoneRiskScoreInputPanel
            mode="test"
            onSubmit={handleSubmit}
            loading={isSubmitting}
          />
          <PhoneRiskScoreOutputPanel
            mode="test"
            response={response}
            error={error}
            request={lastRequest}
          />
        </div>
      )}

      {/* LIVE SINGLE */}
      {environment === "live" && executionMode === "single" && (
        <>
          {!response && (
            <PhoneRiskScoreInputPanel
              mode="live"
              onSubmit={handleSubmit}
              loading={isSubmitting}
            />
          )}

          {response && (
            <>
              <PhoneRiskScoreOutputPanel
                mode="live"
                response={response}
                error={error}
                request={lastRequest}
              />
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
              pricePerRequest={2}
              endpoint="/api/services/phone-risk/bulk"
              jsonExample={BULK_JSON_EXAMPLE}
              validateItem={(i) =>
                typeof i?.phoneNumber === "string" &&
                i.phoneNumber.length > 0 &&
                (i?.emailAddress == null || typeof i.emailAddress === "string")
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