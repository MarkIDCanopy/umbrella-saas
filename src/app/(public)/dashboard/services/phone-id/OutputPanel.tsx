// src/app/(public)/dashboard/services/phone-id/OutputPanel.tsx
"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";
import {
  mapPhoneIdAddonStatusCode,
  mapPhoneIdStatusCode,
  mapCleansingCode,
} from "@/lib/services/phoneId/mappings";

export type PhoneIdRequest = {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  state: string;

  externalId?: string;
  contactEmail?: string;

  includeContactInfo: boolean;
  includeBreachedData: boolean;
  includeCallForwardDetection: boolean;
  includeSubscriberStatus: boolean;
  includePortingStatus: boolean;
  includeSimSwap: boolean;
  includeNumberDeactivation: boolean;

  portingHistoryPastXDays?: string;
  ageThreshold?: string;
};

export type PhoneIdResponse = {
  status: boolean;
  referenceId: string | null;
  externalId: string | null;
  statusInfo: {
    code: number | null;
    description: string | null;
    updatedOn: string | null;
  };
  phoneType: {
    code: string | null;
    description: string | null;
  };
  carrier: string | null;
  blocklisting: {
    blocked: boolean;
    code: number | null;
    description: string | null;
  };
  numbering: {
    original: {
      completePhoneNumber: string | null;
      countryCode: string | null;
      phoneNumber: string | null;
    };
    cleansing: {
      call: {
        countryCode: string | null;
        phoneNumber: string | null;
        cleansedCode: number | null;
        minLength: number | null;
        maxLength: number | null;
      };
      sms: {
        countryCode: string | null;
        phoneNumber: string | null;
        cleansedCode: number | null;
        minLength: number | null;
        maxLength: number | null;
      };
    };
  };
  location: {
    city: string | null;
    state: string | null;
    zip: string | null;
    county: string | null;
    metroCode: string | null;
    country: string | null;
    iso2: string | null;
    iso3: string | null;
    latitude: number | null;
    longitude: number | null;
    timeZone: string | null;
    utcOffsetMin: string | null;
    utcOffsetMax: string | null;
  };
  addons: {
    ageVerify: any | null;
    breachedData: any | null;
    callForwardDetection: any | null;
    contact: any | null;
    contactMatch: any | null;
    numberDeactivation: any | null;
    subscriberStatus: any | null;
    portingHistory: any | null;
    portingStatus: any | null;
    simSwap: any | null;
  };
};

type Props = {
  mode: EnvironmentMode;
  response: PhoneIdResponse | null;
  error?: string | null;
  request?: PhoneIdRequest | null;
  requestFromTxn?: any;
};

const pillStyles: Record<string, string> = {
  OK: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NOK: "border-red-200 bg-red-50 text-red-700",
  ERROR: "border-red-200 bg-red-50 text-red-700",
  REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
};

function executionKey(code: number | null): "OK" | "NOK" | "ERROR" | "REVIEW" {
  if (code === 300) return "OK";
  if (typeof code === "number" && code >= 400 && code < 500) return "NOK";
  if (typeof code === "number" && code >= 200 && code < 400) return "REVIEW";
  return "ERROR";
}

function humanizeKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function flattenObject(
  value: any,
  prefix = ""
): Array<{ label: string; value: string }> {
  if (value == null) return [];
  if (typeof value !== "object") {
    return [{ label: prefix || "Value", value: String(value) }];
  }

  const rows: Array<{ label: string; value: string }> = [];

  for (const [key, child] of Object.entries(value)) {
    const nextLabel = prefix ? `${prefix} · ${humanizeKey(key)}` : humanizeKey(key);

    if (child == null) {
      rows.push({ label: nextLabel, value: "—" });
      continue;
    }

    if (Array.isArray(child)) {
      rows.push({
        label: nextLabel,
        value: child.length ? child.map((x) => String(x)).join(", ") : "—",
      });
      continue;
    }

    if (typeof child === "object") {
      rows.push(...flattenObject(child, nextLabel));
      continue;
    }

    rows.push({ label: nextLabel, value: String(child) });
  }

  return rows;
}

function formatAddonTitle(key: keyof PhoneIdResponse["addons"]) {
  const map: Record<keyof PhoneIdResponse["addons"], string> = {
    ageVerify: "Age Verification",
    breachedData: "Breached Data",
    callForwardDetection: "Call Forwarding Detection",
    contact: "Contact Information",
    contactMatch: "Contact Match",
    numberDeactivation: "Number Deactivation",
    subscriberStatus: "Subscriber Status",
    portingHistory: "Porting History",
    portingStatus: "Porting Status",
    simSwap: "SIM Swap",
  };

  return map[key];
}

export function PhoneIdOutputPanel({
  mode,
  response,
  error,
  request,
  requestFromTxn,
}: Props) {
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
        Run a test request to see the protocol here.
      </div>
    );
  }

  if (!response) return null;

  const reqObj: PhoneIdRequest | null = (request ??
    (requestFromTxn && typeof requestFromTxn === "object"
      ? {
          phoneNumber: requestFromTxn.phoneNumber ?? "",
          firstName: requestFromTxn.firstName ?? "",
          lastName: requestFromTxn.lastName ?? "",
          address: requestFromTxn.address ?? "",
          city: requestFromTxn.city ?? "",
          postalCode: requestFromTxn.postalCode ?? "",
          country: requestFromTxn.country ?? "",
          state: requestFromTxn.state ?? "",
          externalId: requestFromTxn.externalId ?? undefined,
          contactEmail: requestFromTxn.contactEmail ?? undefined,
          includeContactInfo: Boolean(requestFromTxn.includeContactInfo),
          includeBreachedData: Boolean(requestFromTxn.includeBreachedData),
          includeCallForwardDetection: Boolean(
            requestFromTxn.includeCallForwardDetection
          ),
          includeSubscriberStatus: Boolean(requestFromTxn.includeSubscriberStatus),
          includePortingStatus: Boolean(requestFromTxn.includePortingStatus),
          includeSimSwap: Boolean(requestFromTxn.includeSimSwap),
          includeNumberDeactivation: Boolean(
            requestFromTxn.includeNumberDeactivation
          ),
          portingHistoryPastXDays:
            requestFromTxn.portingHistoryPastXDays ?? undefined,
          ageThreshold: requestFromTxn.ageThreshold ?? undefined,
        }
      : null)) as PhoneIdRequest | null;

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

  const exec = executionKey(response.statusInfo?.code ?? null);

  const requestedAddons = [
    reqObj?.includeContactInfo ? "Contact Info" : null,
    reqObj?.includeBreachedData ? "Breached Data" : null,
    reqObj?.includeCallForwardDetection ? "Call Forwarding Detection" : null,
    reqObj?.includeSubscriberStatus ? "Subscriber Status" : null,
    reqObj?.includePortingStatus ? "Porting Status" : null,
    reqObj?.includeSimSwap ? "SIM Swap" : null,
    reqObj?.includeNumberDeactivation ? "Number Deactivation" : null,
    reqObj?.portingHistoryPastXDays
      ? `Porting History (${reqObj.portingHistoryPastXDays} days)`
      : null,
    reqObj?.ageThreshold ? `Age Verification (${reqObj.ageThreshold}+)` : null,
  ].filter(Boolean);

  const rawContactMatchRows = flattenObject(response.addons?.contactMatch);

  const contactMatchRows = rawContactMatchRows
    .filter((row) => row.label.toLowerCase() !== "status · code")
    .map((row) => {
      if (row.label.toLowerCase() === "status · description") {
        const codeRow = rawContactMatchRows.find(
          (x) => x.label.toLowerCase() === "status · code"
        );
        const code = codeRow ? Number(codeRow.value) : null;

        return {
          ...row,
          value:
            code != null && Number.isFinite(code)
              ? mapPhoneIdAddonStatusCode(code)
              : row.value,
        };
      }
      return row;
    });

  const addonEntries = Object.entries(response.addons).filter(
    ([key, value]) => key !== "contactMatch" && value != null
  );

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
    a.download = `phone-id-protocol-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Verification result</h2>
          <p className="text-xs text-muted-foreground">
            Structured protocol for the Phone ID check.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
              pillStyles[exec]
            )}
          >
            <span>Execution</span>
            <span>·</span>
            <span>{exec}</span>
          </div>

          <div className="rounded-md bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {ts}
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      <Section title="Input Summary">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <Row label="Phone number" value={reqObj?.phoneNumber ?? "—"} />
          <Row
            label="Submitted name"
            value={
              reqObj
                ? `${reqObj.firstName} ${reqObj.lastName}`.trim() || "—"
                : "—"
            }
          />
          <Row label="Address" value={reqObj?.address ?? "—"} />
          <Row label="City" value={reqObj?.city ?? "—"} />
          <Row label="Postal code" value={reqObj?.postalCode ?? "—"} />
          <Row label="Country" value={reqObj?.country ?? "—"} />
          <Row label="State / region" value={reqObj?.state ?? "—"} />
          <Row label="Email" value={reqObj?.contactEmail ?? "—"} />
          <Row label="External ID" value={reqObj?.externalId ?? "—"} />
          <Row label="Lifecycle event" value="transact (hidden default)" />
          <Row
            label="Additional insights"
            value={requestedAddons.length ? requestedAddons.join(", ") : "None"}
          />
        </dl>
      </Section>

      <Section title="Contact Match Result">
        {contactMatchRows.length ? (
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            {contactMatchRows.map((row, idx) => (
              <Row
                key={`contact-match-${idx}`}
                label={row.label}
                value={row.value}
              />
            ))}
          </dl>
        ) : (
          <div className="text-sm text-muted-foreground">
            No structured contact match details were returned.
          </div>
        )}
      </Section>

      <Section title="Core Phone Intelligence">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <Row label="Reference ID" value={response.referenceId} />
          <Row label="External ID" value={response.externalId} />
          <Row
            label="Status"
            value={
              response.statusInfo?.code != null
                ? mapPhoneIdStatusCode(response.statusInfo.code)
                : response.statusInfo?.description ?? "—"
            }
          />
          <Row label="Phone type" value={response.phoneType?.description} />
          <Row label="Carrier" value={response.carrier} />
          <Row
            label="Blocklisting"
            value={response.blocklisting?.blocked ? "Blocked" : "Not blocked"}
          />
          <Row label="Block reason" value={response.blocklisting?.description} />
        </dl>
      </Section>

      <Section title="Numbering & Location">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <Row
            label="Original complete number"
            value={response.numbering?.original?.completePhoneNumber}
          />
          <Row
            label="Original country code"
            value={response.numbering?.original?.countryCode}
          />
          <Row
            label="Original local number"
            value={response.numbering?.original?.phoneNumber}
          />
          <Row
            label="Call number format"
            value={mapCleansingCode(response.numbering?.cleansing?.call?.cleansedCode)}
          />
          <Row
            label="SMS number format"
            value={mapCleansingCode(response.numbering?.cleansing?.sms?.cleansedCode)}
          />
          <Row label="Country" value={response.location?.country} />
          <Row label="State" value={response.location?.state} />
          <Row label="City" value={response.location?.city} />
          <Row label="ZIP" value={response.location?.zip} />
          <Row label="County" value={response.location?.county} />
          <Row label="Time zone" value={response.location?.timeZone} />
          <Row
            label="Coordinates"
            value={
              response.location?.latitude != null &&
              response.location?.longitude != null
                ? `${response.location.latitude}, ${response.location.longitude}`
                : "—"
            }
          />
        </dl>
      </Section>

      <Section title="Additional Insights">
        {addonEntries.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No additional insight data returned for this request.
          </div>
        ) : (
          <div className="space-y-3">
            {addonEntries.map(([key, value]) => {
              const rows = flattenObject(value);

              return (
                <details
                  key={key}
                  className="group rounded-lg border bg-background/30 px-3 py-2"
                >
                  <summary className="cursor-pointer list-none select-none text-sm font-medium">
                    <div className="flex items-center justify-between">
                      <span>
                        {formatAddonTitle(key as keyof PhoneIdResponse["addons"])}
                      </span>
                      <span className="text-xs text-muted-foreground group-open:hidden">
                        Show
                      </span>
                      <span className="hidden text-xs text-muted-foreground group-open:inline">
                        Hide
                      </span>
                    </div>
                  </summary>

                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {rows.length ? (
                      rows.map((row, idx) => (
                        <Row
                          key={`${key}-${idx}`}
                          label={row.label}
                          value={row.value}
                        />
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No structured fields returned.
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </Section>

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