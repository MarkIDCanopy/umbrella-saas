// src/app/(public)/dashboard/services/phone-id/page.tsx
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
  PhoneIdInputPanel,
  type PhoneIdPayload,
} from "./InputPanel";
import {
  PhoneIdOutputPanel,
  type PhoneIdResponse,
  type PhoneIdRequest,
} from "./OutputPanel";

const SERVICE_KEY = "phone-id";

const BULK_JSON_EXAMPLE = `[
  {
    "phoneNumber": "+436501234567",
    "firstName": "Max",
    "lastName": "Mustermann",
    "address": "Teststrasse 1",
    "city": "Vienna",
    "postalCode": "1010",
    "country": "AT",
    "state": "Vienna",
    "contactEmail": "test@example.com",
    "includeContactInfo": true,
    "includeBreachedData": true,
    "includeSubscriberStatus": true,
    "includeSimSwap": true,
    "includeCallForwardDetection": false,
    "includePortingStatus": false,
    "includeNumberDeactivation": false
  },
  {
    "phoneNumber": "+4915123456789",
    "firstName": "Jane",
    "lastName": "Doe",
    "address": "Main Street 12",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "DE",
    "state": "Berlin",
    "includeContactInfo": false,
    "includeBreachedData": false,
    "includeSubscriberStatus": false,
    "includeSimSwap": false,
    "includeCallForwardDetection": false,
    "includePortingStatus": true,
    "includeNumberDeactivation": false,
    "portingHistoryPastXDays": "30"
  }
]`;

async function readJsonOrNull(res: Response) {
  return await res.json().catch(() => null);
}

export default function PhoneIdPage() {
  const [environment, setEnvironment] = useState<"test" | "live">("live");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("single");

  const [response, setResponse] = useState<PhoneIdResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lastRequest, setLastRequest] = useState<PhoneIdRequest | null>(null);

  const [bulkConsentConfirmed, setBulkConsentConfirmed] = useState(false);
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
    setBulkConsentConfirmed(false);
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

  async function handleSubmit(payload: PhoneIdPayload) {
    setError(null);
    setLastRequest(payload);

    if (environment === "test") {
      setResponse({
        status: true,
        referenceId: "TEST-PHONEID-REF-123",
        externalId: payload.externalId ?? null,
        statusInfo: {
          code: 300,
          description: "Transaction successfully completed",
          updatedOn: new Date().toISOString(),
        },
        phoneType: {
          code: "2",
          description: "MOBILE",
        },
        carrier: "Test Carrier",
        blocklisting: {
          blocked: false,
          code: 0,
          description: "Not blocked",
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
        location: {
          city: "Vienna",
          state: "Vienna",
          zip: "1010",
          county: null,
          metroCode: null,
          country: "Austria",
          iso2: "AT",
          iso3: "AUT",
          latitude: null,
          longitude: null,
          timeZone: "Europe/Vienna",
          utcOffsetMin: "+1",
          utcOffsetMax: "+2",
        },
        addons: {
          contactMatch: {
            status: {
              code: 2800,
              description: "Request successfully completed",
            },
            score: 92,
            matched: true,
            inputUsed: payload.contactEmail ? "phoneNumber and email" : "phoneNumber",
            firstNameMatch: true,
            lastNameMatch: true,
            addressMatch: true,
            cityMatch: true,
            postalCodeMatch: true,
            stateMatch: true,
            countryMatch: true,
          },
          ageVerify: payload.ageThreshold
            ? {
                ageThreshold: Number(payload.ageThreshold),
                passed: true,
                description: "Threshold satisfied in test mode.",
              }
            : null,
          breachedData: payload.includeBreachedData
            ? {
                breached: false,
                breachCount: 0,
              }
            : null,
          callForwardDetection: payload.includeCallForwardDetection
            ? {
                enabled: false,
                condition: "none",
              }
            : null,
          contact: payload.includeContactInfo
            ? {
                email: payload.contactEmail ?? null,
                name: `${payload.firstName} ${payload.lastName}`,
                address: payload.address,
                city: payload.city,
                state: payload.state,
                postalCode: payload.postalCode,
                country: payload.country,
              }
            : null,
          numberDeactivation: payload.includeNumberDeactivation
            ? {
                lastDeactivated: null,
                trackingSince: "2022-01-01T00:00:00Z",
                recycledSinceLastVerification: "notRecycled",
              }
            : null,
          subscriberStatus: payload.includeSubscriberStatus
            ? {
                accountStatus: "active",
                subscriberType: "postpaid",
                tenureMonths: 24,
              }
            : null,
          portingHistory: payload.portingHistoryPastXDays
            ? {
                pastXDays: Number(payload.portingHistoryPastXDays),
                portCount: 0,
              }
            : null,
          portingStatus: payload.includePortingStatus
            ? {
                currentCarrier: "Test Carrier",
                recentlyPorted: false,
              }
            : null,
          simSwap: payload.includeSimSwap
            ? {
                swappedRecently: false,
                riskLevel: "low",
              }
            : null,
        },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/services/phone-id/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readJsonOrNull(res);

      if (!res.ok) {
        throw new Error(data?.error ?? data?.providerError ?? "Phone ID failed");
      }

      setResponse(data);
      await refreshCredits();
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Phone ID failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetToInput() {
    setResponse(null);
    setBulkConsentConfirmed(false);
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
        title="Phone ID"
        description="Match submitted identity data against carrier-linked records and enrich the result with optional phone intelligence."
        badge="Enrichment"
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
          <PhoneIdInputPanel
            mode="test"
            onSubmit={handleSubmit}
            loading={isSubmitting}
          />
          <PhoneIdOutputPanel
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
            <PhoneIdInputPanel
              mode="live"
              onSubmit={handleSubmit}
              loading={isSubmitting}
            />
          )}

          {response && (
            <>
              <PhoneIdOutputPanel
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
              endpoint="/api/services/phone-id/bulk"
              jsonExample={BULK_JSON_EXAMPLE}
              validateItem={(i) =>
                typeof i?.phoneNumber === "string" &&
                i.phoneNumber.length > 0 &&
                typeof i?.firstName === "string" &&
                i.firstName.length > 0 &&
                typeof i?.lastName === "string" &&
                i.lastName.length > 0 &&
                typeof i?.address === "string" &&
                i.address.length > 0 &&
                typeof i?.city === "string" &&
                i.city.length > 0 &&
                typeof i?.postalCode === "string" &&
                i.postalCode.length > 0 &&
                typeof i?.country === "string" &&
                i.country.length > 0 &&
                typeof i?.state === "string" &&
                i.state.length > 0 &&
                typeof i?.includeContactInfo === "boolean" &&
                typeof i?.includeBreachedData === "boolean" &&
                typeof i?.includeCallForwardDetection === "boolean" &&
                typeof i?.includeSubscriberStatus === "boolean" &&
                typeof i?.includePortingStatus === "boolean" &&
                typeof i?.includeSimSwap === "boolean" &&
                typeof i?.includeNumberDeactivation === "boolean" &&
                (i?.externalId == null || typeof i.externalId === "string") &&
                (i?.contactEmail == null || typeof i.contactEmail === "string") &&
                (i?.portingHistoryPastXDays == null ||
                  typeof i.portingHistoryPastXDays === "string") &&
                (i?.ageThreshold == null || typeof i.ageThreshold === "string") &&
                (i?.consentConfirmed == null || typeof i.consentConfirmed === "boolean")
              }
              bulkConsentLabel="I confirm that the necessary user consent exists for the requested enrichment data in all transactions."
              bulkConsentChecked={bulkConsentConfirmed}
              onBulkConsentChange={setBulkConsentConfirmed}
              transformItemsBeforeSubmit={(items) =>
                bulkConsentConfirmed
                  ? items.map((item) => ({ ...item, consentConfirmed: true }))
                  : items
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