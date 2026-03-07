// src/app/(public)/dashboard/services/phone-status/OutputPanel.tsx
"use client";

import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";
import { cn } from "@/lib/utils";

export type PhoneStatusResponse = {
  referenceId: string;
  status: {
    code: number;
    description: string;
    updatedOn: string;
  };
  phoneType?: string;
  carrier?: string;
  subscriberStatus?: string;
  deviceStatus?: string;
  roaming?: string;
  location?: {
    country?: string;
    city?: string;
  };
};

type Props = {
  mode: EnvironmentMode;
  response: PhoneStatusResponse | null;
  error?: string | null;
};

export function PhoneStatusOutputPanel({ mode, response, error }: Props) {
  if (mode === "live" && error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <b>Request failed</b>
        <p>{error}</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
        Run a request to see the phone status here.
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6">
      <Header response={response} />

      <Section title="Status">
        <Row label="Subscriber" value={response.subscriberStatus} />
        <Row label="Device" value={response.deviceStatus} />
        <Row label="Roaming" value={response.roaming} />
      </Section>

      <Section title="Network">
        <Row label="Phone type" value={response.phoneType} />
        <Row label="Carrier" value={response.carrier} />
      </Section>

      <Section title="Location">
        <Row label="Country" value={response.location?.country} />
        <Row label="City" value={response.location?.city} />
      </Section>
    </section>
  );
}

function Header({ response }: { response: PhoneStatusResponse }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold">Result</h2>
        <p className="text-xs text-muted-foreground">
          Reference ID: {response.referenceId}
        </p>
      </div>

      <span
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-semibold",
          response.status.code === 300
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        )}
      >
        {response.status.code}
      </span>
    </div>
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
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="grid gap-2 rounded-md border bg-background/40 p-3">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value ?? "—"}</div>
    </div>
  );
}
