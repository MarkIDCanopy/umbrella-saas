// src/app/(public)/dashboard/services/address-verification/gate/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ComplianceGate,
  type ComplianceGateConfig,
} from "@/components/compliance/ComplianceGate";

function normalizeCC(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

export default function AddressVerificationGatePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const key = String(sp.get("key") ?? "address-verification").trim();
  const countryCode = normalizeCC(sp.get("country") ?? "AT");
  const tncVersion = String(sp.get("tncVersion") ?? "v1").trim();

  const [open, setOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config: ComplianceGateConfig<{ dummy: true }> = useMemo(
    () => ({
      when: () => true,
      title: `Additional confirmation required (${countryCode})`,
      description: `Before using Address Verification for ${countryCode}, please accept the Terms & Conditions and provide a reason.`,
      keyForForm: () => `gate:${key}:${countryCode}:${tncVersion}`,
      requirements: [
        {
          type: "accept_tnc",
          id: "accepted_tnc",
          label:
            "I confirm I have the legal basis to verify persons and I accept the Terms & Conditions.",
          linkLabel: "View Terms",
        },
        {
          type: "select_reason",
          id: "reason",
          label: "Reason for verification",
          placeholder: "Select a reason",
          options: [
            { value: "onboarding", label: "Customer onboarding" },
            { value: "fraud_prevention", label: "Fraud prevention" },
            { value: "regulatory", label: "Regulatory requirement" },
            { value: "account_recovery", label: "Account recovery" },
            { value: "other", label: "Other" },
          ],
        },
      ],
    }),
    [key, countryCode, tncVersion]
  );

  async function handleConfirmed(result: Record<string, string | boolean>) {
    setError(null);

    try {
      const res = await fetch("/api/compliance/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          countryCode,
          tncVersion,
          acceptedTerms: result.accepted_tnc === true,
          reason: typeof result.reason === "string" ? result.reason : "",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Failed to store consent");
        setOpen(true);
        return;
      }

      setOpen(false);
      router.replace("/dashboard/services/address-verification");
    } catch (e: any) {
      setError(
        typeof e?.message === "string" ? e.message : "Failed to store consent"
      );
      setOpen(true);
    }
  }

  useEffect(() => setOpen(true), []);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <ComplianceGate
        form={{ dummy: true }}
        config={config}
        open={open}
        onOpenChange={setOpen}
        onCancel={() => router.replace("/dashboard/services")}
        onConfirmed={handleConfirmed}
      />

      {error ? (
        <div className="mt-4 rounded-md border bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}