// src/app/(public)/dashboard/services/kyb/OutputPanel.tsx
"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";
import type { KybResponse } from "@/lib/services/mappers/kyb";

type Props = {
  mode: EnvironmentMode;
  response: KybResponse | null;
  error?: string | null;
  request?: any | null;
  requestFromTxn?: any;
  onProceedToAdvanced?: (args: {
    transactionId: string;
    companyId: string;
  }) => void;
};

type DisplayEntry = {
  label: string;
  value: string | number | null;
};

export function KybOutputPanel({
  mode,
  response,
  error,
  request,
  requestFromTxn,
  onProceedToAdvanced,
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
            {response.kind === "company-search"
              ? "Select a company to continue to advanced search."
              : "Detailed company data returned from advanced search."}
          </p>
        </div>

        <div className="rounded-md bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          {ts}
        </div>
      </div>

      <div className="h-px bg-border" />

      {response.kind === "company-search" ? (
        <Section title="Matches">
          {!response.companies.length ? (
            <div className="text-sm text-muted-foreground">
              No matching companies were returned.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {response.resultCount} matching{" "}
                {response.resultCount === 1 ? "company" : "companies"} found.
              </div>

              {response.companies.map((item, idx) => {
                const txId = item.transactionId ?? response.transactionId;
                const canProceed = Boolean(txId && item.companyId);

                return (
                  <div
                    key={item.companyId ?? `${item.name ?? "company"}-${idx}`}
                    className="rounded-xl border bg-background/40 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold">
                            {item.name ?? "Unnamed company"}
                          </div>

                          {item.status && (
                            <span className="inline-flex rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              {formatStatus(item.status)}
                            </span>
                          )}
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <Row label="Transaction ID" value={txId} />
                          <Row label="Company ID" value={item.companyId} />
                          <Row
                            label="Country"
                            value={item.country ?? item.countryCode}
                          />
                          <Row
                            label="Registration number"
                            value={item.registrationNumber}
                          />
                          <Row label="Legal form" value={item.legalForm} />
                          <Row label="Address" value={item.address} />
                        </dl>
                      </div>

                      <div className="lg:pl-4">
                        <Button
                          type="button"
                          disabled={!canProceed}
                          onClick={() => {
                            if (!txId || !item.companyId || !onProceedToAdvanced) {
                              return;
                            }

                            onProceedToAdvanced({
                              transactionId: txId,
                              companyId: item.companyId,
                            });
                          }}
                        >
                          Proceed to advanced search
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      ) : (
        <>
          <Section title="Input Summary">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Operation" value={reqObj?.operation ?? response.kind} />
              <Row
                label="Transaction ID"
                value={reqObj?.transactionId ?? response.transactionId ?? "—"}
              />
              <Row
                label="Company ID"
                value={reqObj?.companyId ?? response.companyId ?? "—"}
              />
            </dl>
          </Section>

          <Section title="Company Summary">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-lg font-semibold">
                  {response.companySummary.name ?? "Unnamed company"}
                </div>

                {response.companySummary.status && (
                  <span className="inline-flex rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {formatStatus(response.companySummary.status)}
                  </span>
                )}
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Row
                  label="Company ID"
                  value={
                    response.companySummary.companyId ??
                    reqObj?.companyId ??
                    response.companyId ??
                    null
                  }
                />
                <Row
                  label="Country"
                  value={
                    response.companySummary.country ??
                    response.companySummary.countryCode
                  }
                />
                <Row
                  label="Registration number"
                  value={response.companySummary.registrationNumber}
                />
                <Row
                  label="Legal form"
                  value={response.companySummary.legalForm}
                />
                <Row
                  label="Incorporated on"
                  value={formatDisplayDate(response.companySummary.incorporatedOn)}
                />
                <ValueRow
                  label="Website"
                  value={
                    response.companySummary.website ? (
                      <a
                        href={normalizeUrl(response.companySummary.website)}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-base font-medium text-foreground underline underline-offset-4"
                      >
                        {response.companySummary.website}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
              </dl>
            </div>
          </Section>

          <Section title="Included datasets">
            <div className="space-y-2">
              <Accordion title={`Officers (${response.officers.length})`}>
                <OfficerList officers={response.officers} />
              </Accordion>

              <Accordion title={`Addresses (${response.addresses.length})`}>
                <AddressList addresses={response.addresses} />
              </Accordion>

              <Accordion title={`Ownerships (${response.ownerships.length})`}>
                <GenericCollectionList
                  items={response.ownerships}
                  emptyText="No ownership data returned."
                  itemTitle="Ownership"
                />
              </Accordion>

              <Accordion
                title={`Transparency (${getCollectionCount(response.transparency)})`}
              >
                <TransparencyBlock data={response.transparency} />
              </Accordion>

              <Accordion title={`Documents (${response.documents.length})`}>
                <GenericCollectionList
                  items={response.documents}
                  emptyText="No document data returned."
                  itemTitle="Document"
                />
              </Accordion>

              <Accordion title={`Financials (${response.financials.length})`}>
                <GenericCollectionList
                  items={response.financials}
                  emptyText="No financial data returned."
                  itemTitle="Financial record"
                />
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
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-base font-medium leading-6">{display}</dd>
    </div>
  );
}

function ValueRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-base font-medium leading-6">{value}</dd>
    </div>
  );
}

function Accordion({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-lg border bg-background/30 px-3 py-2">
      <summary className="cursor-pointer list-none select-none text-sm font-medium">
        <div className="flex items-center justify-between gap-3">
          <span>{title}</span>
          <span className="text-xs text-muted-foreground group-open:hidden">
            Show
          </span>
          <span className="hidden text-xs text-muted-foreground group-open:inline">
            Hide
          </span>
        </div>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function OfficerList({ officers }: { officers: any[] }) {
  if (!Array.isArray(officers) || officers.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No officer data returned.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {officers.map((officer, idx) => {
        const officerData = officer?.officerData ?? {};
        const activity = officer?.activity ?? {};
        const role = getOfficerRole(officer);
        const activeStatus = formatStatus(activity?.status ?? officer?.status);
        const signatureQuality = formatStatus(
          activity?.signatureRights?.signatureQuality
        );

        return (
          <div
            key={officer?.officerId ?? `${officerData?.legalName ?? "officer"}-${idx}`}
            className="rounded-xl border bg-background/50 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-semibold">
                {getOfficerName(officer)}
              </div>

              {activeStatus && (
                <span className="inline-flex rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {activeStatus}
                </span>
              )}
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Row label="Role" value={role} />
              <Row label="Type" value={formatStatus(officer?.type)} />
              <Row label="Officer ID" value={officer?.officerId ?? null} />
              <Row
                label="Date of birth"
                value={formatDisplayDate(officerData?.dob)}
              />
              <Row label="Birthplace" value={officerData?.birthplace ?? null} />
              <Row
                label="Country"
                value={officerData?.country ?? officerData?.countryOfBirth ?? null}
              />
              <Row
                label="Address"
                value={officerData?.address?.singleLine ?? formatStructuredAddress(officerData?.address?.structured)}
              />
              <Row label="From" value={formatDisplayDate(activity?.from)} />
              <Row label="To" value={formatDisplayDate(activity?.to)} />
              <Row
                label="Signature rights"
                value={signatureQuality ?? null}
              />
              <Row label="Phone" value={activity?.phone ?? null} />
              <Row label="Email" value={activity?.email ?? null} />
            </dl>
          </div>
        );
      })}
    </div>
  );
}

function AddressList({ addresses }: { addresses: any[] }) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No address data returned.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.map((address, idx) => {
        const structured = address?.structured ?? {};
        const fullAddress =
          address?.singleLine ?? formatStructuredAddress(structured);

        return (
          <div
            key={`${address?.type ?? "address"}-${idx}`}
            className="rounded-xl border bg-background/50 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-semibold">
                {formatStatus(address?.type) ?? "Address"}
              </div>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Full address" value={fullAddress} />
              <Row label="Country" value={structured?.country ?? null} />
              <Row label="Line 1" value={structured?.line1 ?? null} />
              <Row label="Line 2" value={structured?.line2 ?? null} />
              <Row label="City" value={structured?.city ?? null} />
              <Row label="Postal code" value={structured?.postalCode ?? null} />
              <Row label="Region" value={structured?.region ?? null} />
            </dl>
          </div>
        );
      })}
    </div>
  );
}

function TransparencyBlock({ data }: { data: any }) {
  const hasArrayItems = Array.isArray(data) && data.length > 0;
  const hasObjectEntries =
    data && typeof data === "object" && !Array.isArray(data) && Object.keys(data).length > 0;

  if (!hasArrayItems && !hasObjectEntries) {
    return (
      <div className="text-sm text-muted-foreground">
        No transparency data returned.
      </div>
    );
  }

  if (Array.isArray(data)) {
    return (
      <GenericCollectionList
        items={data}
        emptyText="No transparency data returned."
        itemTitle="Transparency entry"
      />
    );
  }

  return <KeyValueCard title="Transparency" data={data} />;
}

function GenericCollectionList({
  items,
  emptyText,
  itemTitle,
}: {
  items: any[];
  emptyText: string;
  itemTitle: string;
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyText}</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <KeyValueCard
          key={`${itemTitle}-${idx}`}
          title={`${itemTitle} ${idx + 1}`}
          data={item}
        />
      ))}
    </div>
  );
}

function KeyValueCard({
  title,
  data,
}: {
  title: string;
  data: any;
}) {
  const entries = toDisplayEntries(data);

  return (
    <div className="rounded-xl border bg-background/50 p-4">
      <div className="text-base font-semibold">{title}</div>

      {entries.length === 0 ? (
        <div className="mt-3 text-sm text-muted-foreground">
          No structured fields available.
        </div>
      ) : (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Row
              key={`${entry.label}-${String(entry.value)}`}
              label={entry.label}
              value={entry.value}
            />
          ))}
        </dl>
      )}
    </div>
  );
}

function toDisplayEntries(data: any): DisplayEntry[] {
  if (!data || typeof data !== "object") return [];

  const entries: DisplayEntry[] = [];

  walkObject(data, "", entries, 0);

  return entries.filter((entry) => {
    return entry.value !== null && entry.value !== "";
  });
}

function walkObject(
  value: any,
  prefix: string,
  output: DisplayEntry[],
  depth: number
) {
  if (depth > 2 || value == null) return;

  if (Array.isArray(value)) {
    if (value.length === 0) return;

    const primitiveValues = value.filter(
      (item) =>
        item == null ||
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
    );

    if (primitiveValues.length === value.length) {
      output.push({
        label: prefix || "Value",
        value: primitiveValues.join(", "),
      });
      return;
    }

    value.forEach((item, index) => {
      walkObject(item, prefix ? `${prefix} ${index + 1}` : `Item ${index + 1}`, output, depth + 1);
    });
    return;
  }

  if (typeof value !== "object") {
    output.push({
      label: humanizeKey(prefix || "Value"),
      value: normalizePrimitiveValue(prefix, value),
    });
    return;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    if (nestedValue == null) return;

    const nextPrefix = prefix ? `${prefix} ${key}` : key;

    if (
      typeof nestedValue === "string" ||
      typeof nestedValue === "number" ||
      typeof nestedValue === "boolean"
    ) {
      output.push({
        label: humanizeKey(nextPrefix),
        value: normalizePrimitiveValue(nextPrefix, nestedValue),
      });
      return;
    }

    walkObject(nestedValue, nextPrefix, output, depth + 1);
  });
}

function getOfficerName(officer: any) {
  const officerData = officer?.officerData ?? {};

  return (
    officerData?.legalName ??
    joinNonEmpty([officerData?.firstName, officerData?.lastName], " ") ??
    "Unnamed officer"
  );
}

function getOfficerRole(officer: any) {
  const activity = officer?.activity ?? {};

  return (
    activity?.role?.modeled?.value ??
    activity?.role?.native?.value ??
    formatStatus(officer?.type) ??
    null
  );
}

function getCollectionCount(value: any) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return 0;
}

function formatDisplayDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatStatus(value?: string | null) {
  if (!value) return null;

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatStructuredAddress(structured: any) {
  if (!structured || typeof structured !== "object") return null;

  const line = joinNonEmpty([structured?.line1, structured?.line2], ", ");
  const locality = joinNonEmpty(
    [structured?.postalCode, structured?.city],
    " "
  );
  const region = structured?.region ?? null;
  const country = structured?.country ?? null;

  return joinNonEmpty([line, locality, region, country], ", ");
}

function normalizeUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function humanizeKey(value: string) {
  return value
    .replace(/\./g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizePrimitiveValue(key: string, value: string | number | boolean) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return value;
  }

  const lowerKey = key.toLowerCase();
  if (
    lowerKey.includes("date") ||
    lowerKey.endsWith("dob") ||
    lowerKey.endsWith("from") ||
    lowerKey.endsWith("to") ||
    lowerKey.includes("incorporated")
  ) {
    return formatDisplayDate(value) ?? value;
  }

  return value;
}

function joinNonEmpty(values: Array<string | null | undefined>, separator: string) {
  const filtered = values.filter(
    (value): value is string => Boolean(value && String(value).trim())
  );

  return filtered.length ? filtered.join(separator) : null;
}