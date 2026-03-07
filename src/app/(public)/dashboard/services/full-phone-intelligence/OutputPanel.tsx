// src/app/(public)/dashboard/services/full-phone-intelligence/OutputPanel.tsx
"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";
import {
  mapCleansingCode,
  mapFullPhoneIntelligenceStatusCode,
  mapRiskInsightsStatusCode,
} from "@/lib/services/fullPhoneIntelligence/mappings";
import { mapReasonCodes } from "@/lib/services/phoneRiskScore/mappings";

export type FullPhoneIntelligenceRequest = {
  phoneNumber: string;
  externalId?: string;
};

export type FullPhoneIntelligenceResponse = {
  status: boolean;
  referenceId: string | null;
  externalId: string | null;
  statusInfo: {
    updatedOn: string | null;
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
  riskInsights: {
    status: number | null;
    category: number[];
    a2P: number[];
    p2P: number[];
    numberType: number[];
    ip: number[];
    email: number[];
  };
  phoneType: {
    code: string | null;
    description: string | null;
  };
  location: {
    city: string | null;
    state: string | null;
    zip: string | null;
    metroCode: string | null;
    county: string | null;
    country: {
      name: string | null;
      iso2: string | null;
      iso3: string | null;
    };
    coordinates: {
      latitude: number | null;
      longitude: number | null;
    };
    timeZone: {
      name: string | null;
      utcOffsetMin: string | null;
      utcOffsetMax: string | null;
    };
  };
  carrier: {
    name: string | null;
  };
  blocklisting: {
    blocked: boolean;
    blockCode: number | null;
    blockDescription: string | null;
  };
  risk: {
    level: string | null;
    recommendation: string | null;
    score: number | null;
  };
};

type Props = {
  mode: EnvironmentMode;
  response: FullPhoneIntelligenceResponse | null;
  error?: string | null;
  request?: FullPhoneIntelligenceRequest | null;
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

function mapReasonCodeArray(value: number[] | null | undefined) {
  if (!value || !value.length) return "—";
  const mapped = mapReasonCodes(value);
  return mapped.length ? mapped.join("\n") : "—";
}

export function FullPhoneIntelligenceOutputPanel({
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

  const reqObj: FullPhoneIntelligenceRequest | null = (request ??
    (requestFromTxn && typeof requestFromTxn === "object"
      ? {
          phoneNumber: requestFromTxn.phoneNumber ?? "",
          externalId: requestFromTxn.externalId ?? undefined,
        }
      : null)) as FullPhoneIntelligenceRequest | null;

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
    a.download = `full-phone-intelligence-protocol-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Verification result</h2>
          <p className="text-xs text-muted-foreground">
            Structured protocol for the Full Phone Intelligence check.
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
          <Row label="External ID" value={reqObj?.externalId ?? "—"} />
        </dl>
      </Section>

      <Section title="Risk Summary">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <Row label="Reference ID" value={response.referenceId} />
          <Row label="External ID" value={response.externalId} />
          <Row
            label="Status"
            value={
              response.statusInfo?.code != null
                ? mapFullPhoneIntelligenceStatusCode(response.statusInfo.code)
                : response.statusInfo?.description ?? "—"
            }
          />
          <Row label="Risk level" value={response.risk?.level} />
          <Row
            label="Recommendation"
            value={response.risk?.recommendation}
          />
          <Row label="Risk score" value={response.risk?.score} />
          <Row
            label="Risk insights status"
            value={mapRiskInsightsStatusCode(response.riskInsights?.status)}
            />
        </dl>
      </Section>

      <Section title="Risk Insight Signals">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
            <Row
            label="Category"
            value={mapReasonCodeArray(response.riskInsights?.category)}
            />
            <Row
            label="A2P"
            value={mapReasonCodeArray(response.riskInsights?.a2P)}
            />
            <Row
            label="P2P"
            value={mapReasonCodeArray(response.riskInsights?.p2P)}
            />
            <Row
            label="Number type"
            value={mapReasonCodeArray(response.riskInsights?.numberType)}
            />
            <Row
            label="IP"
            value={mapReasonCodeArray(response.riskInsights?.ip)}
            />
            <Row
            label="Email"
            value={mapReasonCodeArray(response.riskInsights?.email)}
            />
        </dl>
        </Section>

      <Section title="Core Phone Intelligence">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <Row label="Phone type" value={response.phoneType?.description} />
          {/* <Row label="Phone type code" value={response.phoneType?.code} /> */}
          <Row label="Carrier" value={response.carrier?.name} />
          <Row
            label="Blocklisting"
            value={response.blocklisting?.blocked ? "Blocked" : "Not blocked"}
          />
          <Row label="Block code" value={response.blocklisting?.blockCode} />
          <Row
            label="Block reason"
            value={response.blocklisting?.blockDescription}
          />
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
          <Row label="Country" value={response.location?.country?.name} />
          <Row label="Country ISO2" value={response.location?.country?.iso2} />
          <Row label="Country ISO3" value={response.location?.country?.iso3} />
          <Row label="State" value={response.location?.state} />
          <Row label="City" value={response.location?.city} />
          <Row label="ZIP" value={response.location?.zip} />
          <Row label="County" value={response.location?.county} />
          <Row label="Metro code" value={response.location?.metroCode} />
          <Row label="Time zone" value={response.location?.timeZone?.name} />
          <Row
            label="UTC offset min"
            value={response.location?.timeZone?.utcOffsetMin}
          />
          <Row
            label="UTC offset max"
            value={response.location?.timeZone?.utcOffsetMax}
          />
          <Row
            label="Coordinates"
            value={
              response.location?.coordinates?.latitude != null &&
              response.location?.coordinates?.longitude != null
                ? `${response.location.coordinates.latitude}, ${response.location.coordinates.longitude}`
                : "—"
            }
          />
        </dl>
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