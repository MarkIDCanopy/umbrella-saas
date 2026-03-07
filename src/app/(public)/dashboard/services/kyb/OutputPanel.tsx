// src/app/(public)/dashboard/services/kyb/OutputPanel.tsx
"use client";

import { useMemo } from "react";
import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";
import type { KybResponse } from "@/lib/services/mappers/kyb";

type Props = {
  mode: EnvironmentMode;
  response: KybResponse | null;
  error?: string | null;
  request?: any | null;
  requestFromTxn?: any;
};

export function KybOutputPanel({
  mode,
  response,
  error,
  request,
  requestFromTxn,
}: Props) {
  const reqObj = request ?? requestFromTxn ?? null;

  const ts = useMemo(() => {
    return new Date().toISOString().replace("T", " ").split(".")[0];
  }, [response]);

  if (mode === "live" && error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <h3 className="mb-1 font-semibold">Request failed</h3>
        <p>{error || "Something went wrong. Please try again."}</p>
      </div>
    );
  }

  if (!response && mode === "test") {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
        Run a test request to see the KYB protocol here.
      </div>
    );
  }

  if (!response) return null;

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
    a.download = `kyb-protocol-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Verification result</h2>
          <p className="text-xs text-muted-foreground">
            Machine-readable protocol for the KYB request.
          </p>
        </div>

        <div className="rounded-md bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          {ts}
        </div>
      </div>

      <div className="h-px bg-border" />

      <Section title="Input Summary">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <Row label="Operation" value={reqObj?.operation ?? response.kind} />
          <Row label="Name" value={reqObj?.name ?? "—"} />
          <Row label="Country" value={reqObj?.country ?? "—"} />
          <Row label="Transaction ID" value={reqObj?.transactionId ?? response.transactionId ?? "—"} />
          <Row label="Company ID" value={reqObj?.companyId ?? ("companyId" in response ? response.companyId : "—")} />
        </dl>
      </Section>

      {response.kind === "company-search" ? (
        <>
          <Section title="Search Summary">
            <dl className="grid gap-2 text-sm md:grid-cols-2">
              <Row label="Status" value={response.status ? "Success" : "Failed"} />
              <Row label="Transaction ID" value={response.transactionId ?? "—"} />
              <Row label="Result count" value={response.resultCount} />
            </dl>
          </Section>

          <Section title="Matches">
            {!response.companies.length ? (
              <div className="text-sm text-muted-foreground">
                No matching companies were returned.
              </div>
            ) : (
              <div className="space-y-3">
                {response.companies.map((item, idx) => (
                  <div key={idx} className="rounded-lg border bg-background/40 p-4">
                    <div className="text-sm font-semibold">
                      {item.name ?? "Unnamed company"}
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                      <Row label="Company ID" value={item.companyId} />
                      <Row label="Country" value={item.country ?? item.countryCode} />
                      <Row label="Registration number" value={item.registrationNumber} />
                      <Row label="Status" value={item.status} />
                      <Row label="Legal form" value={item.legalForm} />
                      <Row label="Address" value={item.address} />
                      <Row label="Score" value={item.score} />
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      ) : (
        <>
          <Section title="Company Summary">
            <dl className="grid gap-2 text-sm md:grid-cols-2">
              <Row label="Name" value={response.companySummary.name} />
              <Row label="Company ID" value={response.companySummary.companyId} />
              <Row
                label="Country"
                value={response.companySummary.country ?? response.companySummary.countryCode}
              />
              <Row
                label="Registration number"
                value={response.companySummary.registrationNumber}
              />
              <Row label="Status" value={response.companySummary.status} />
              <Row label="Legal form" value={response.companySummary.legalForm} />
              <Row label="Incorporated on" value={response.companySummary.incorporatedOn} />
              <Row label="Website" value={response.companySummary.website} />
            </dl>
          </Section>

          <Section title="Included datasets">
            <div className="space-y-2">
              <Accordion title={`Officers (${response.officers.length})`}>
                <JsonBlock data={response.officers} emptyText="No officer data returned." />
              </Accordion>

              <Accordion title={`Addresses (${response.addresses.length})`}>
                <JsonBlock data={response.addresses} emptyText="No address data returned." />
              </Accordion>

              <Accordion title={`Ownerships (${response.ownerships.length})`}>
                <JsonBlock data={response.ownerships} emptyText="No ownership data returned." />
              </Accordion>

              <Accordion title="Transparency">
                <JsonBlock data={response.transparency} emptyText="No transparency data returned." />
              </Accordion>

              <Accordion title={`Documents (${response.documents.length})`}>
                <JsonBlock data={response.documents} emptyText="No document data returned." />
              </Accordion>

              <Accordion title={`Financials (${response.financials.length})`}>
                <JsonBlock data={response.financials} emptyText="No financial data returned." />
              </Accordion>
            </div>
          </Section>
        </>
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
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="rounded-md border bg-background/40 p-3">{children}</div>
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
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="whitespace-pre-wrap text-sm font-medium">{display}</dd>
    </div>
  );
}

function Accordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-lg border bg-background/30 px-3 py-2">
      <summary className="cursor-pointer list-none select-none text-sm font-medium">
        <div className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-xs text-muted-foreground group-open:hidden">
            Show
          </span>
          <span className="hidden text-xs text-muted-foreground group-open:inline">
            Hide
          </span>
        </div>
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

function JsonBlock({
  data,
  emptyText,
}: {
  data: any;
  emptyText: string;
}) {
  const isEmptyArray = Array.isArray(data) && data.length === 0;
  const isEmptyObject =
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Object.keys(data).length === 0;

  if (data == null || isEmptyArray || isEmptyObject) {
    return <div className="text-sm text-muted-foreground">{emptyText}</div>;
  }

  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}