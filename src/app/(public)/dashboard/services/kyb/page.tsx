// src/app/(public)/dashboard/services/kyb/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { ServiceHeader } from "@/components/service-layout/ServiceHeader";
import { EnvironmentToggle } from "@/components/service-layout/EnvironmentToggle";
import { useUser } from "@/context/UserContext";

import { KybModeToggle } from "./KybModeToggle";
import {
  CompanySearchInputPanel,
  AdvancedSearchInputPanel,
} from "./InputPanels";
import { KybOutputPanel } from "./OutputPanel";

import type {
  KybMode,
  KybResponse,
  KybCompanySearchPayload,
  KybAdvancedSearchPayload,
} from "@/lib/services/mappers/kyb";

async function readJsonOrNull(res: Response) {
  return await res.json().catch(() => null);
}

export default function KybPage() {
  const [environment, setEnvironment] = useState<"test" | "live">("live");
  const [mode, setMode] = useState<KybMode>("company-search");

  const [response, setResponse] = useState<KybResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastRequest, setLastRequest] = useState<any | null>(null);

  const { refreshCredits } = useUser();

  const primaryActionClass =
    "mt-4 inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90";

  useEffect(() => {
    setResponse(null);
    setError(null);
    setIsSubmitting(false);
    setLastRequest(null);
  }, [environment, mode]);

  const currentCost = useMemo(() => {
    // adjust these to your actual pricing
    return mode === "company-search" ? 2 : 2;
  }, [mode]);

  async function handleCompanySearch(payload: KybCompanySearchPayload) {
    setError(null);
    setLastRequest({
      operation: "company-search",
      ...payload,
    });

    if (environment === "test") {
      setResponse({
        kind: "company-search",
        status: true,
        transactionId: "TEST-KYB-TX-123",
        resultCount: 2,
        companies: [
          {
            companyId: "COMP-DE-001",
            name: "Siemens AG",
            country: "Germany",
            countryCode: "DE",
            registrationNumber: "HRB 6684",
            status: "Active",
            address: "Werner-von-Siemens-Straße 1, Munich",
            legalForm: "AG",
            score: 98,
            raw: {},
          },
          {
            companyId: "COMP-DE-002",
            name: "Siemens Healthineers AG",
            country: "Germany",
            countryCode: "DE",
            registrationNumber: "HRB 237879",
            status: "Active",
            address: "Siemensstraße 3, Erlangen",
            legalForm: "AG",
            score: 93,
            raw: {},
          },
        ],
        raw: {},
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/services/kyb/company-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readJsonOrNull(res);

      if (!res.ok) {
        throw new Error(data?.error ?? data?.providerError ?? "Company search failed");
      }

      setResponse(data);
      await refreshCredits();
    } catch (e: any) {
      setError(
        typeof e?.message === "string" ? e.message : "Company search failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAdvancedSearch(payload: KybAdvancedSearchPayload) {
    setError(null);
    setLastRequest({
      operation: "advanced-search",
      ...payload,
    });

    if (environment === "test") {
      setResponse({
        kind: "advanced-search",
        status: true,
        transactionId: payload.transactionId,
        companyId: payload.companyId,
        companySummary: {
          companyId: payload.companyId,
          name: "Siemens AG",
          country: "Germany",
          countryCode: "DE",
          registrationNumber: "HRB 6684",
          status: "Active",
          legalForm: "AG",
          incorporatedOn: "1966-01-01",
          website: "https://www.siemens.com",
        },
        officers: payload.include.officers
          ? [{ name: "Sample Officer", role: "Board Member" }]
          : [],
        addresses: payload.include.addresses
          ? [{ type: "Registered", line1: "Werner-von-Siemens-Straße 1" }]
          : [],
        ownerships: payload.include.ownerships
          ? [{ owner: "Sample Holding", percent: 51 }]
          : [],
        transparency: payload.include.transparency
          ? { score: "medium", notes: ["Demo transparency payload"] }
          : null,
        documents: payload.include.documents
          ? [{ type: "Annual Report", year: 2024 }]
          : [],
        financials: payload.include.financials
          ? [{ year: 2024, revenue: "demo-value" }]
          : [],
        raw: {},
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/services/kyb/advanced-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readJsonOrNull(res);

      if (!res.ok) {
        throw new Error(data?.error ?? data?.providerError ?? "Advanced search failed");
      }

      setResponse(data);
      await refreshCredits();
    } catch (e: any) {
      setError(
        typeof e?.message === "string" ? e.message : "Advanced search failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetToInput() {
    setResponse(null);
    setError(null);
    setIsSubmitting(false);
    setLastRequest(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <ServiceHeader
        title="IDC KYB"
        description="Search companies and retrieve detailed business verification data for KYB workflows."
        badge="KYB"
      />

      <EnvironmentToggle
        mode={environment}
        setMode={setEnvironment}
        fromCost={currentCost}
        cost={currentCost}
      />

      <KybModeToggle mode={mode} setMode={setMode} />

      {!response && mode === "company-search" && (
        <CompanySearchInputPanel
          mode={environment}
          onSubmit={handleCompanySearch}
          loading={isSubmitting}
        />
      )}

      {!response && mode === "advanced-search" && (
        <AdvancedSearchInputPanel
          mode={environment}
          onSubmit={handleAdvancedSearch}
          loading={isSubmitting}
        />
      )}

      {response && (
        <>
          <KybOutputPanel
            mode={environment}
            response={response}
            error={error}
            request={lastRequest}
          />
          <button onClick={resetToInput} className={primaryActionClass}>
            Run another request
          </button>
        </>
      )}

      {error && !response && (
        <div className="rounded-md border bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}