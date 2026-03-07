// src/app/(public)/dashboard/services/full-phone-intelligence/page.tsx
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
import { useUser } from "@/context/UserContext";

import {
  FullPhoneIntelligenceInputPanel,
  type FullPhoneIntelligencePayload,
} from "./InputPanel";
import {
  FullPhoneIntelligenceOutputPanel,
  type FullPhoneIntelligenceResponse,
  type FullPhoneIntelligenceRequest,
} from "./OutputPanel";

const SERVICE_KEY = "full-phone-intelligence";

const BULK_JSON_EXAMPLE = `[
  {
    "phoneNumber": "+436501234567",
    "externalId": "FULL-PHONE-001"
  },
  {
    "phoneNumber": "+4915123456789",
    "externalId": "FULL-PHONE-002"
  }
]`;

async function readJsonOrNull(res: Response) {
  return await res.json().catch(() => null);
}

export default function FullPhoneIntelligencePage() {
  const [environment, setEnvironment] = useState<"test" | "live">("live");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("single");

  const [response, setResponse] = useState<FullPhoneIntelligenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lastRequest, setLastRequest] =
    useState<FullPhoneIntelligenceRequest | null>(null);

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

  async function handleSubmit(payload: FullPhoneIntelligencePayload) {
    setError(null);
    setLastRequest(payload);

    if (environment === "test") {
      setResponse({
        status: true,
        referenceId: "TEST-FULLPHONEINTEL-REF-123",
        externalId: payload.externalId ?? null,
        statusInfo: {
          updatedOn: new Date().toISOString(),
          code: 300,
          description: "Transaction successfully completed",
        },
        numbering: {
          original: {
            completePhoneNumber: payload.phoneNumber,
            countryCode: "43",
            phoneNumber: payload.phoneNumber.replace(/\D/g, "").slice(-9),
          },
          cleansing: {
            call: {
              countryCode: "43",
              phoneNumber: payload.phoneNumber.replace(/\D/g, "").slice(-9),
              cleansedCode: 100,
              minLength: 7,
              maxLength: 13,
            },
            sms: {
              countryCode: "43",
              phoneNumber: payload.phoneNumber.replace(/\D/g, "").slice(-9),
              cleansedCode: 100,
              minLength: 7,
              maxLength: 13,
            },
          },
        },
        riskInsights: {
          status: 800,
          category: [10010],
          a2P: [22007, 20011, 20101],
          p2P: [30201],
          numberType: [],
          ip: [],
          email: [],
        },
        phoneType: {
          code: "2",
          description: "MOBILE",
        },
        location: {
          city: "Countrywide",
          state: null,
          zip: null,
          metroCode: null,
          county: null,
          country: {
            name: "Austria",
            iso2: "AT",
            iso3: "AUT",
          },
          coordinates: {
            latitude: null,
            longitude: null,
          },
          timeZone: {
            name: null,
            utcOffsetMin: "+1",
            utcOffsetMax: "+1",
          },
        },
        carrier: {
          name: "T-Mobile Austria GmbH",
        },
        blocklisting: {
          blocked: false,
          blockCode: 0,
          blockDescription: "Not blocked",
        },
        risk: {
          level: "medium-low",
          recommendation: "allow",
          score: 301,
        },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/services/full-phone-intelligence/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readJsonOrNull(res);

      if (!res.ok) {
        throw new Error(
          data?.error ?? data?.providerError ?? "Full Phone Intelligence failed"
        );
      }

      setResponse(data);
      await refreshCredits();
    } catch (e: any) {
      setError(
        typeof e?.message === "string"
          ? e.message
          : "Full Phone Intelligence failed"
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
        title="Full Phone Intelligence"
        description="Comprehensive phone risk and telecom intelligence in one API call."
        badge="Risk & Enrichment"
      />

      <EnvironmentToggle
        mode={environment}
        setMode={setEnvironment}
        fromCost={2}
        cost={2}
      />

      {environment === "live" && (
        <ExecutionModeToggle mode={executionMode} setMode={setExecutionMode} />
      )}

      {environment === "test" && (
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <FullPhoneIntelligenceInputPanel
            mode="test"
            onSubmit={handleSubmit}
            loading={isSubmitting}
          />
          <FullPhoneIntelligenceOutputPanel
            mode="test"
            response={response}
            error={error}
            request={lastRequest}
          />
        </div>
      )}

      {environment === "live" && executionMode === "single" && (
        <>
          {!response && (
            <FullPhoneIntelligenceInputPanel
              mode="live"
              onSubmit={handleSubmit}
              loading={isSubmitting}
            />
          )}

          {response && (
            <>
              <FullPhoneIntelligenceOutputPanel
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

      {environment === "live" && executionMode === "bulk" && (
        <>
          {!bulkSubmitted && (
            <BulkRequestForm
              pricePerRequest={2}
              endpoint="/api/services/full-phone-intelligence/bulk"
              jsonExample={BULK_JSON_EXAMPLE}
              validateItem={(i) =>
                typeof i?.phoneNumber === "string" &&
                i.phoneNumber.length > 0 &&
                (i?.externalId == null || typeof i.externalId === "string")
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