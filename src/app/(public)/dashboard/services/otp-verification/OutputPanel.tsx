// src/app/(public)/dashboard/services/otp-verification/OutputPanel.tsx
"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";
import type {
  OtpStartResponse,
  OtpMatchResponse,
} from "@/lib/services/mappers/otpVerification";

type Props = {
  mode: EnvironmentMode;
  startResponse: OtpStartResponse | null;
  matchResponse: OtpMatchResponse | null;
  error?: string | null;
  startRequest?: any | null;
  matchRequest?: any | null;
};

const STATUS_CODE_TEXT: Record<number, string> = {
  300: "Transaction successfully completed",
  301: "Transaction partially completed",
  400: "Bad Request",
  401: "Unauthorized",
  404: "Not Found",
  429: "Too Many Requests",
  500: "Invalid Transaction",
  503: "Service Unavailable",

  3900: "Verified",
  3901: "Request in progress",
  3905: "Invalid OTP",
};

export function OtpOutputPanel({
  mode,
  startResponse,
  matchResponse,
  error,
  startRequest,
  matchRequest,
}: Props) {
  const ts = useMemo(() => {
    return new Date().toISOString().replace("T", " ").split(".")[0];
  }, [startResponse, matchResponse]);

  if (mode === "live" && error && !startResponse) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <h3 className="mb-1 font-semibold">Request failed</h3>
        <p>{error || "Something went wrong. Please try again."}</p>
      </div>
    );
  }

  if (!startResponse && mode === "test") {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
        Run a test request to see the OTP verification protocol here.
      </div>
    );
  }

  if (!startResponse) return null;

  function downloadProtocol() {
    const fileContent = JSON.stringify(
      {
        timestamp: ts,
        startRequest: startRequest ?? null,
        startResponse,
        matchRequest: matchRequest ?? null,
        matchResponse: matchResponse ?? null,
      },
      null,
      2
    );

    const blob = new Blob([fileContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `otp-verification-protocol-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusTone = matchResponse?.verified
    ? "success"
    : matchResponse && !matchResponse.verified
    ? "error"
    : "pending";

  const recipientDisplay =
    startRequest?.method === "email"
      ? startRequest?.email ?? startResponse.recipient.email ?? "—"
      : startRequest?.phoneNumber ?? startResponse.recipient.phoneNumber ?? "—";

  const startStatusText = getStatusText(
    startResponse.statusCode,
    startResponse.statusDescription
  );

  const matchStatusText = matchResponse
    ? getStatusText(matchResponse.statusCode, matchResponse.statusDescription)
    : null;

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Verification result</h2>
          <p className="text-xs text-muted-foreground">
            Review the verification flow and finalize it with the OTP match step.
          </p>
        </div>

        <div className="rounded-md bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          {ts}
        </div>
      </div>

      <div className="h-px bg-border" />

      <Section title="Current Status">
        {statusTone === "success" ? (
          <StatusCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Verified"
            text={matchStatusText ?? "The OTP was confirmed successfully."}
            tone="success"
          />
        ) : statusTone === "error" ? (
          <StatusCard
            icon={<XCircle className="h-5 w-5" />}
            title="Verification failed"
            text={error ?? matchStatusText ?? "The OTP did not match."}
            tone="error"
          />
        ) : (
          <StatusCard
            icon={<Clock3 className="h-5 w-5" />}
            title="OTP sent"
            text={startStatusText ?? "The verification has been started. Enter the OTP to complete the flow."}
            tone="pending"
          />
        )}
      </Section>

      <Section title="Start Verification">
        <div className="space-y-4">
          <dl className="grid gap-4 md:grid-cols-2">
            <Row label="Method" value={startRequest?.method?.toUpperCase() ?? "—"} />
            <Row label="Recipient" value={recipientDisplay} />
            <Row label="State" value={formatStatus(startResponse.state)} />
            <Row
              label="Updated on"
              value={formatDisplayDateTime(startResponse.statusUpdatedOn)}
            />
            <Row label="Status" value={startStatusText} />
          </dl>

          <TechnicalRow
            label="Reference ID"
            value={startResponse.referenceId}
          />

          {startResponse.mobileAppToken && (
            <TechnicalRow
              label="Mobile App Token"
              value={startResponse.mobileAppToken}
            />
          )}
        </div>
      </Section>

      {matchResponse && (
        <Section title="OTP Match">
          <div className="space-y-4">
            <dl className="grid gap-4 md:grid-cols-2">
              <Row label="Verified" value={matchResponse.verified ? "Yes" : "No"} />
              <Row label="State" value={formatStatus(matchResponse.state)} />
              <Row label="Status" value={matchStatusText} />
            </dl>

            <TechnicalRow
              label="Reference ID"
              value={matchResponse.referenceId}
            />
          </div>
        </Section>
      )}

      {mode === "live" && (
        <button
          onClick={downloadProtocol}
          className="w-full rounded-md border bg-muted py-2 text-sm font-medium transition hover:bg-muted/60"
        >
          Download Protocol
        </button>
      )}
    </section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="rounded-xl border bg-background/40 p-4">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const display =
    value === "" || value === undefined || value === null
      ? "—"
      : value === 0
      ? "0"
      : String(value);

  return (
    <div className="min-w-0 flex flex-col gap-1">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-base font-medium leading-6">
        {display}
      </dd>
    </div>
  );
}

function TechnicalRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const display =
    value === "" || value === undefined || value === null
      ? "—"
      : String(value);

  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-all font-mono text-sm leading-6">
        {display}
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  title,
  text,
  tone,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  tone: "success" | "error" | "pending";
}) {
  const styles =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm">{text}</div>
        </div>
      </div>
    </div>
  );
}

function getStatusText(
  code?: number | null,
  fallbackDescription?: string | null
) {
  if (typeof code === "number" && STATUS_CODE_TEXT[code]) {
    return STATUS_CODE_TEXT[code];
  }

  if (fallbackDescription && fallbackDescription.trim()) {
    return fallbackDescription;
  }

  if (typeof code === "number") {
    return `Status ${code}`;
  }

  return null;
}

function formatStatus(value?: string | null) {
  if (!value) return null;

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDisplayDateTime(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  }).format(date);
}