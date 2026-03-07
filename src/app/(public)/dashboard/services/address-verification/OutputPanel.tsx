// src/app/(public)/dashboard/services/address-verification/OutputPanel.tsx
"use client";

import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";
import { cn } from "@/lib/utils";

export type AddressVerifyResponse = {
  inputAddress: string;
  correctedAddress: string;
  finalAddress: string;
  addressStatus: string;
  matchQuality: string;
  score: number;
  globalResult: {
    overall: "OK" | "NOK" | "REVIEW" | "ERROR" | string;
    totalScore: number;
  };
  identity: {
    fullName: string;
    dob: string;
  };
  extendedMessage: string;
  timestamp?: string;
};

type AddressRequest = {
  country?: string;
  address?: {
    street?: string;
    number?: string;
    zip?: string;
    city?: string;
    province?: string;
  };
  identity?: {
    firstname?: string;
    lastname?: string;
    dob?: string;
  };
};

type Props = {
  mode: EnvironmentMode;
  response: AddressVerifyResponse | null;
  error?: string | null;

  // ✅ NEW: used in Transactions overview when provider response is missing fields
  requestFromTxn?: AddressRequest | null;
};

const statusStyles: Record<string, { pill: string; label: string }> = {
  OK: { pill: "border-emerald-200 bg-emerald-50 text-emerald-700", label: "OK" },
  REVIEW: { pill: "border-amber-200 bg-amber-50 text-amber-700", label: "Review" },
  NOK: { pill: "border-red-200 bg-red-50 text-red-700", label: "Not OK" },
  ERROR: { pill: "border-red-200 bg-red-50 text-red-700", label: "Error" },
};

function fmtTimestamp(raw?: string) {
  if (raw) return raw;
  return new Date().toISOString().replace("T", " ").split(".")[0];
}

function buildInputFromRequest(req?: AddressRequest | null) {
  const a = req?.address;
  if (!a) return null;

  const country = String(req?.country ?? "").trim();
  const street = String(a.street ?? "").trim();
  const num = String(a.number ?? "").trim();
  const zip = String(a.zip ?? "").trim();
  const city = String(a.city ?? "").trim();

  const inputAddress = [street, num].filter(Boolean).join(" ").trim();
  const line2 = [zip, city].filter(Boolean).join(" ").trim();

  const combined = [inputAddress, line2].filter(Boolean).join(", ");

  return {
    inputAddress: combined || "—",
    finalAddress: combined || "—",
    correctedAddress: country ? `${combined}${combined ? ", " : ""}${country}` : combined || "—",
    addressStatus: "—",
  };
}

export function AddressOutputPanel({ mode, response, error, requestFromTxn }: Props) {
  if (mode === "live" && error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <h3 className="font-semibold mb-1">Verification failed</h3>
        <p>{error || "Something went wrong. Please try again."}</p>
      </div>
    );
  }

  if (!response && mode === "test") {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
        Run a test verification to see the protocol here.
      </div>
    );
  }

  if (!response && mode === "live") return null;
  if (!response) return null;

  const overall = response.globalResult?.overall ?? "OK";
  const style = statusStyles[overall] ?? statusStyles.REVIEW;
  const timestamp = fmtTimestamp(response.timestamp);

  // ✅ Fallback: if provider response doesn’t contain these fields, use requestFromTxn
  const fallback = buildInputFromRequest(requestFromTxn);

  const inputAddress =
    response.inputAddress && response.inputAddress.trim().length > 0
      ? response.inputAddress
      : fallback?.inputAddress ?? "—";

  const finalAddress =
    response.finalAddress && response.finalAddress.trim().length > 0
      ? response.finalAddress
      : fallback?.finalAddress ?? "—";

  const correctedAddress =
    response.correctedAddress && response.correctedAddress.trim().length > 0
      ? response.correctedAddress
      : fallback?.correctedAddress ?? "—";

  const addressStatus =
    response.addressStatus && response.addressStatus.trim().length > 0
      ? response.addressStatus
      : fallback?.addressStatus ?? "—";

  function downloadProtocol() {
    const fileContent = JSON.stringify({ ...response, timestamp }, null, 2);
    const blob = new Blob([fileContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `address-verification-protocol-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Verification result</h2>
          <p className="text-xs text-muted-foreground">
            Machine-readable protocol for the address and identity check.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
              style.pill
            )}
          >
            <span>Overall</span>
            <span>·</span>
            <span>{style.label}</span>
          </div>

          <div className="rounded-md bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {timestamp}
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      <Section title="Input Summary">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <Row label="Input address" value={inputAddress} />
          <Row label="Final address" value={finalAddress} />
          <Row label="Corrected address" value={correctedAddress} />
          <Row label="Address status" value={addressStatus} />
        </dl>
      </Section>

      <Section title="Verification">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <Row label="Match quality" value={response.matchQuality} />
          <Row label="Score" value={response.score} />
          <Row label="Extended message" value={response.extendedMessage} />
          <Row label="Identity full name" value={response.identity?.fullName ?? "—"} />
          <Row label="Date of birth" value={response.identity?.dob ?? "—"} />
        </dl>
      </Section>

      <Section title="Global Result">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <Row label="Overall result" value={overall} />
          <Row label="Timestamp" value={timestamp} />
        </dl>
      </Section>

      {mode === "live" && (
        <button
          onClick={downloadProtocol}
          className="w-full rounded-md border bg-muted py-2 text-sm font-medium hover:bg-muted/60 transition"
        >
          Download Protocol
        </button>
      )}
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="rounded-md border bg-background/40 p-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  const display =
    value === "" || value === undefined || value === null ? "—" : value === 0 ? "0" : String(value);

  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{display}</dd>
    </div>
  );
}