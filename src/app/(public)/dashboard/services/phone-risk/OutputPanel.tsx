// src/app/(public)/dashboard/services/phone-risk/OutputPanel.tsx
"use client";

import { useMemo, useState } from "react";
import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";
import { cn } from "@/lib/utils";

export type PhoneRiskScoreResponse = {
  status: boolean;
  referenceId: string | null;
  externalId: string | null;
  statusInfo: {
    code: number | null;
    description: string | null;
    updatedOn: string | null;
  };
  phoneType: string | null;
  carrier: string | null;
  location: {
    country: string | null;
    iso2: string | null;
    city: string | null;
    timeZone?: string | null;
    utcOffsetMin?: string | null;
    utcOffsetMax?: string | null;
  };
  blocklisting: {
    blocked: boolean;
    description: string | null;
    code?: number | null;
  };
  risk: {
    score: number | null;
    level: string | null;
    recommendation: string | null;
    interpretation: {
      band: string;
      recommendation: "allow" | "flag" | "block";
      explanation: string;
    } | null;
  };
  riskInsights: {
    status?: number | null;
    category: string[];
    a2p: string[];
    p2p: string[];
    numberType: string[];
    ip: string[];
    email: string[];
  };
};

export type PhoneRiskRequest = {
  phoneNumber: string;
  emailAddress?: string;
  accountLifecycleEvent?: string;
};

type Props = {
  mode: EnvironmentMode;
  response: PhoneRiskScoreResponse | null;
  error?: string | null;

  // ✅ page can pass this
  request?: PhoneRiskRequest | null;

  // ✅ transaction detail view can pass txn.request here (or you can reuse `request`)
  requestFromTxn?: any;
};

const pillStyles: Record<string, string> = {
  OK: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NOK: "border-red-200 bg-red-50 text-red-700",
  ERROR: "border-red-200 bg-red-50 text-red-700",
  REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
  ALLOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FLAG: "border-amber-200 bg-amber-50 text-amber-700",
  BLOCK: "border-red-200 bg-red-50 text-red-700",
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function scoreToPercent(score: number | null) {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  return clamp(Math.round((score / 1000) * 100), 0, 100);
}

function prettyUnknown(v: string) {
  const m = v.match(/Unknown reason code:\s*(\d+)/i);
  if (!m) return v;
  return `Unmapped code: ${m[1]}`;
}
function splitKnownUnknown(items: string[]) {
  const known: string[] = [];
  const unknown: string[] = [];
  for (const it of items || []) {
    const nice = prettyUnknown(it);
    if (nice.toLowerCase().startsWith("unmapped code:")) unknown.push(nice);
    else known.push(nice);
  }
  return { known, unknown };
}
function totalCount(known: string[], unknown: string[]) {
  return (known?.length ?? 0) + (unknown?.length ?? 0);
}

function decisionKey(resp: PhoneRiskScoreResponse) {
  const d = String(resp.risk?.recommendation ?? resp.risk?.interpretation?.recommendation ?? "flag")
    .trim()
    .toUpperCase();
  if (d === "ALLOW") return "ALLOW";
  if (d === "BLOCK") return "BLOCK";
  return "FLAG";
}

function executionKey(code: number | null): "OK" | "NOK" | "ERROR" | "REVIEW" {
  // provider semantics: 300 success
  if (code === 300) return "OK";
  if (typeof code === "number" && code >= 400 && code < 500) return "NOK";
  // if we got a non-300 but still a 2xx-like pattern, mark review
  if (typeof code === "number" && code >= 200 && code < 400) return "REVIEW";
  return "ERROR";
}

export function PhoneRiskScoreOutputPanel({
  mode,
  response,
  error,
  request,
  requestFromTxn,
}: Props) {
  const [showEmpty, setShowEmpty] = useState(false);

  if (mode === "live" && error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <h3 className="font-semibold mb-1">Request failed</h3>
        <p>{error || "Something went wrong. Please try again."}</p>
      </div>
    );
  }

  if (!response && mode === "test") {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
        Run a test request to see the protocol here.
      </div>
    );
  }

  if (!response && mode === "live") return null;
  if (!response) return null;

  // ✅ Find request data for Input Summary:
  // prefer explicit `request`, else transaction request passed in `requestFromTxn`
  const reqObj: PhoneRiskRequest | null = (request ??
    (requestFromTxn && typeof requestFromTxn === "object"
      ? {
          phoneNumber: requestFromTxn.phoneNumber,
          emailAddress: requestFromTxn.emailAddress,
          accountLifecycleEvent: requestFromTxn.accountLifecycleEvent,
        }
      : null)) as any;

  const ts = useMemo(() => {
    const raw = response.statusInfo?.updatedOn;
    if (raw) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().replace("T", " ").split(".")[0];
      }
    }
    return new Date().toISOString().replace("T", " ").split(".")[0];
  }, [response.statusInfo?.updatedOn]);

  const decision = decisionKey(response);
  const exec = executionKey(response.statusInfo?.code ?? null);

  const score = response.risk?.score ?? null;
  const percent = scoreToPercent(score);
  const band = response.risk?.interpretation?.band ?? "—";
  const explanation = response.risk?.interpretation?.explanation ?? "—";

  const { known: catKnown, unknown: catUnknown } = splitKnownUnknown(response.riskInsights?.category ?? []);
  const { known: a2pKnown, unknown: a2pUnknown } = splitKnownUnknown(response.riskInsights?.a2p ?? []);
  const { known: p2pKnown, unknown: p2pUnknown } = splitKnownUnknown(response.riskInsights?.p2p ?? []);
  const { known: ntKnown, unknown: ntUnknown } = splitKnownUnknown(response.riskInsights?.numberType ?? []);
  const { known: ipKnown, unknown: ipUnknown } = splitKnownUnknown(response.riskInsights?.ip ?? []);
  const { known: emKnown, unknown: emUnknown } = splitKnownUnknown(response.riskInsights?.email ?? []);

  const hasEmailSignals = totalCount(emKnown, emUnknown) > 0;

  function downloadProtocol() {
    const fileContent = JSON.stringify(
      {
        timestamp: ts,
        request: reqObj ?? null,
        response,
      },
      null,
      2
    );
    const blob = new Blob([fileContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `phone-risk-protocol-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Verification result</h2>
          <p className="text-xs text-muted-foreground">
            Machine-readable protocol for the Phone Risk Score check.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* ✅ Execution pill */}
          <div className={cn("flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", pillStyles[exec])}>
            <span>Execution</span>
            <span>·</span>
            <span>{exec}</span>
          </div>

          {/* ✅ Decision pill */}
          <div className={cn("flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", pillStyles[decision])}>
            <span>Decision</span>
            <span>·</span>
            <span>{decision}</span>
          </div>

          <div className="rounded-md bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {ts}
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* INPUT SUMMARY */}
      <Section title="Input Summary">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <Row label="Phone number" value={reqObj?.phoneNumber ?? "—"} />
          <Row label="Email address" value={reqObj?.emailAddress ?? "—"} />
          <Row label="Lifecycle event" value={(reqObj?.accountLifecycleEvent ?? "transact") + " (hidden default)"} />
          <Row label="Email signals" value={hasEmailSignals ? "Detected" : "Not detected / Not provided"} />
        </dl>
      </Section>

      {/* RISK DECISION */}
      <Section title="Risk Decision">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <Row label="Risk score" value={score ?? "—"} />
          <Row label="Band" value={band} />
          <Row label="Recommendation" value={decision} />
          <Row label="Risk level" value={response.risk?.level ?? "—"} />
          <Row label="Explanation" value={explanation} />
          <Row label="Blocklisting" value={response.blocklisting?.blocked ? "Blocked" : "Not blocked"} />
        </dl>

        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className={cn(
                "h-2 rounded-full",
                decision === "ALLOW" ? "bg-emerald-500" : decision === "BLOCK" ? "bg-red-500" : "bg-amber-500"
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </Section>

      {/* INSIGHTS */}
      <Section title="Insights">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Expand sections to see which signals influenced the decision.
          </p>
          <button
            type="button"
            onClick={() => setShowEmpty((v) => !v)}
            className="text-xs text-muted-foreground underline underline-offset-4"
          >
            {showEmpty ? "Hide empty groups" : "Show empty groups"}
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {(showEmpty || totalCount(catKnown, catUnknown) > 0) && (
            <Accordion title={`Overall category (${catKnown.length}${catUnknown.length ? ` + ${catUnknown.length} unmapped` : ""})`}>
              <ReasonList items={catKnown} emptyText="No category signals." />
              <UnmappedList items={catUnknown} />
            </Accordion>
          )}

          {(showEmpty || totalCount(a2pKnown, a2pUnknown) > 0) && (
            <Accordion title={`A2P signals (${a2pKnown.length}${a2pUnknown.length ? ` + ${a2pUnknown.length} unmapped` : ""})`}>
              <ReasonList items={a2pKnown} emptyText="No A2P signals." />
              <UnmappedList items={a2pUnknown} />
            </Accordion>
          )}

          {(showEmpty || totalCount(p2pKnown, p2pUnknown) > 0) && (
            <Accordion title={`P2P signals (${p2pKnown.length}${p2pUnknown.length ? ` + ${p2pUnknown.length} unmapped` : ""})`}>
              <ReasonList items={p2pKnown} emptyText="No P2P signals." />
              <UnmappedList items={p2pUnknown} />
            </Accordion>
          )}

          {(showEmpty || totalCount(ntKnown, ntUnknown) > 0) && (
            <Accordion title={`Number type signals (${ntKnown.length}${ntUnknown.length ? ` + ${ntUnknown.length} unmapped` : ""})`}>
              <ReasonList items={ntKnown} emptyText="No number-type signals." />
              <UnmappedList items={ntUnknown} />
            </Accordion>
          )}

          {(showEmpty || totalCount(ipKnown, ipUnknown) > 0) && (
            <Accordion title={`IP signals (${ipKnown.length}${ipUnknown.length ? ` + ${ipUnknown.length} unmapped` : ""})`}>
              <ReasonList items={ipKnown} emptyText="No IP signals (or IP not provided)." />
              <UnmappedList items={ipUnknown} />
            </Accordion>
          )}

          {(showEmpty || totalCount(emKnown, emUnknown) > 0) && (
            <Accordion title={`Email signals (${emKnown.length}${emUnknown.length ? ` + ${emUnknown.length} unmapped` : ""})`}>
              <ReasonList items={emKnown} emptyText="No email signals (or email not provided)." />
              <UnmappedList items={emUnknown} />
            </Accordion>
          )}
        </div>
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
    value === "" || value === undefined || value === null
      ? "—"
      : value === 0
      ? "0"
      : String(value);

  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium whitespace-pre-wrap">{display}</dd>
    </div>
  );
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-lg border bg-background/30 px-3 py-2">
      <summary className="cursor-pointer list-none select-none text-sm font-medium">
        <div className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
          <span className="hidden text-xs text-muted-foreground group-open:inline">Hide</span>
        </div>
      </summary>
      <div className="mt-2 space-y-3">{children}</div>
    </details>
  );
}

function ReasonList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (!items?.length) return <div className="text-sm text-muted-foreground">{emptyText}</div>;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((x, idx) => (
        <li key={idx} className="rounded-md border bg-background/40 px-3 py-2">
          {x}
        </li>
      ))}
    </ul>
  );
}

function UnmappedList({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-[11px] uppercase text-muted-foreground">Unmapped</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((x, idx) => (
          <span
            key={idx}
            className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground"
          >
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}