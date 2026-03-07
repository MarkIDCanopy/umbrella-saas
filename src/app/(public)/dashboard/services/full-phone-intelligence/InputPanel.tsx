// src/app/(public)/dashboard/services/full-phone-intelligence/InputPanel.tsx
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";
import { cn } from "@/lib/utils";
import {
  cleanExternalId,
  cleanPhoneInput,
} from "@/lib/input-safeguards";

export type FullPhoneIntelligencePayload = {
  phoneNumber: string;
  externalId?: string;
};

type Props = {
  mode: EnvironmentMode;
  onSubmit: (payload: FullPhoneIntelligencePayload) => void;
  loading?: boolean;
};

function Field({
  label,
  required,
  invalid,
  children,
}: {
  label: string;
  required?: boolean;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className={cn("text-sm font-medium", invalid && "text-red-700")}>
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {invalid ? (
        <p className="text-xs text-red-600">This field is required.</p>
      ) : null}
    </div>
  );
}

export function FullPhoneIntelligenceInputPanel({
  mode,
  onSubmit,
  loading,
}: Props) {
  const [phoneNumber, setPhoneNumber] = useState(
    mode === "test" ? "+436501234567" : ""
  );
  const [externalId, setExternalId] = useState(
    mode === "test" ? "FULL-PHONE-INTEL-DEMO-001" : ""
  );

  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setPhoneNumber(mode === "test" ? "+436501234567" : "");
    setExternalId(mode === "test" ? "FULL-PHONE-INTEL-DEMO-001" : "");
    setError(null);
    setSubmitted(false);
  }, [mode]);

  const cleanedPhone = cleanPhoneInput(phoneNumber);
  const invalidPhone =
    submitted && (!cleanedPhone || cleanedPhone.replace(/\D/g, "").length < 8);

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);

    if (!cleanedPhone || cleanedPhone.replace(/\D/g, "").length < 8) {
      setError("Please enter a valid phone number including country code.");
      return;
    }

    onSubmit({
      phoneNumber: cleanedPhone,
      externalId: externalId.trim() ? cleanExternalId(externalId) : undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold">
          {mode === "test" ? "Test request" : "Live request"}
        </h2>
        <p className="text-xs text-muted-foreground">
          Full Phone Intelligence returns a combined phone risk and telecom
          intelligence profile in one request.
        </p>
      </div>

      <section className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Phone number" required invalid={invalidPhone}>
            <Input
              placeholder="+436501234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(cleanPhoneInput(e.target.value))}
              className={cn(
                invalidPhone &&
                  "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500"
              )}
            />
          </Field>

          <Field label="External ID">
            <Input
              placeholder="External ID (optional)"
              value={externalId}
              onChange={(e) => setExternalId(cleanExternalId(e.target.value))}
            />
          </Field>
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={!phoneNumber || loading}>
        {loading ? "Running check…" : "Run Full Phone Intelligence"}
      </Button>
    </form>
  );
}
