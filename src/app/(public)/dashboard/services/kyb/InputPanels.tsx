// src/app/(public)/dashboard/services/kyb/InputPanels.tsx
"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";
import type {
  KybCompanySearchPayload,
  KybAdvancedSearchPayload,
  KybIncludeOptions,
} from "@/lib/services/mappers/kyb";

type SearchProps = {
  mode: EnvironmentMode;
  onSubmit: (payload: KybCompanySearchPayload) => void;
  loading?: boolean;
};

type AdvancedProps = {
  mode: EnvironmentMode;
  onSubmit: (payload: KybAdvancedSearchPayload) => void;
  loading?: boolean;
  initialTransactionId?: string;
  initialCompanyId?: string;
};

const DEFAULT_INCLUDE: KybIncludeOptions = {
  officers: true,
  addresses: true,
  ownerships: true,
  transparency: true,
  documents: true,
  financials: true,
};

export function CompanySearchInputPanel({
  mode,
  onSubmit,
  loading,
}: SearchProps) {
  const [name, setName] = useState(mode === "test" ? "Siemens" : "");
  const [country, setCountry] = useState(mode === "test" ? "DE" : "");

  useEffect(() => {
    setName(mode === "test" ? "Siemens" : "");
    setCountry(mode === "test" ? "DE" : "");
  }, [mode]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      country: country.trim() ? country.trim().toUpperCase() : undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold">
          {mode === "test" ? "Test company search" : "Company search"}
        </h2>
        <p className="text-xs text-muted-foreground">
          Search a company by name. Country is optional but strongly recommended for better matches.
        </p>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="Siemens"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="Country code (optional, e.g. DE)"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          maxLength={2}
        />
      </div>

      <Button type="submit" className="w-full" disabled={!name.trim() || loading}>
        {loading ? "Searching…" : "Search company"}
      </Button>
    </form>
  );
}

export function AdvancedSearchInputPanel({
  mode,
  onSubmit,
  loading,
  initialTransactionId,
  initialCompanyId,
}: AdvancedProps) {
  const defaultTransactionId = mode === "test" ? "TEST-KYB-TX-123" : "";
  const defaultCompanyId = mode === "test" ? "TEST-COMPANY-001" : "";

  const [transactionId, setTransactionId] = useState(
    initialTransactionId ?? defaultTransactionId
  );
  const [companyId, setCompanyId] = useState(
    initialCompanyId ?? defaultCompanyId
  );
  const [include, setInclude] = useState<KybIncludeOptions>(DEFAULT_INCLUDE);

  useEffect(() => {
    setTransactionId(initialTransactionId ?? defaultTransactionId);
  }, [initialTransactionId, defaultTransactionId]);

  useEffect(() => {
    setCompanyId(initialCompanyId ?? defaultCompanyId);
  }, [initialCompanyId, defaultCompanyId]);

  useEffect(() => {
    setInclude(DEFAULT_INCLUDE);
  }, [mode]);

  function toggle(key: keyof KybIncludeOptions) {
    setInclude((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      transactionId: transactionId.trim(),
      companyId: companyId.trim(),
      include,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold">
          {mode === "test" ? "Test advanced search" : "Advanced search"}
        </h2>
        <p className="text-xs text-muted-foreground">
          Use the transaction ID and company ID from Company search to retrieve deeper corporate KYB data.
        </p>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="transactionId"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
        />
        <Input
          placeholder="companyId"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <div className="text-sm font-medium">Include datasets</div>

        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["officers", "Officers"],
              ["addresses", "Addresses"],
              ["ownerships", "Ownerships"],
              ["transparency", "Transparency"],
              ["documents", "Documents"],
              ["financials", "Financials"],
            ] as Array<[keyof KybIncludeOptions, string]>
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={include[key]}
                onChange={() => toggle(key)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!transactionId.trim() || !companyId.trim() || loading}
      >
        {loading ? "Loading…" : "Get company details"}
      </Button>
    </form>
  );
}