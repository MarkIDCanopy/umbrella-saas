// src/app/(public)/dashboard/services/phone-id/InputPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";
import { cn } from "@/lib/utils";
import {
  cleanAddressLine,
  cleanCity,
  cleanCountryFlexible,
  cleanEmail,
  cleanExternalId,
  cleanName,
  cleanPhoneInput,
  cleanPostalCode,
  cleanState,
} from "@/lib/input-safeguards";

export type PhoneIdPayload = {
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

  consentConfirmed?: boolean;
};

type Props = {
  mode: EnvironmentMode;
  onSubmit: (payload: PhoneIdPayload) => void;
  loading?: boolean;
};

const ADDON_COPY = {
  contactInfo: "Returns known contact details such as name, address, and email.",
  breachedData:
    "Checks whether the phone number has appeared in known data breaches.",
  callForwardDetection:
    "Detects if call forwarding is active and under what conditions.",
  subscriberStatus:
    "Provides subscriber account details like type, tenure, and activation.",
  portingStatus:
    "Displays the current carrier and whether the number has been recently ported.",
  simSwap: "Detects recent SIM changes and evaluates takeover risk.",
  numberDeactivation:
    "Indicates if and when the number was deactivated or recycled.",
  portingHistory:
    "Shows porting history of the number across carriers in a selected time window.",
  ageVerify:
    "Verifies whether the subscriber meets a selected age threshold. Usually relevant for US/UK use cases.",
};

function ToggleCard({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background/40 px-3 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4"
      />
      <div className="space-y-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </label>
  );
}

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
      <label
        className={cn(
          "text-sm font-medium",
          invalid && "text-red-700"
        )}
      >
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

export function PhoneIdInputPanel({ mode, onSubmit, loading }: Props) {
  const [phoneNumber, setPhoneNumber] = useState(
    mode === "test" ? "+436501234567" : ""
  );
  const [firstName, setFirstName] = useState(mode === "test" ? "Max" : "");
  const [lastName, setLastName] = useState(
    mode === "test" ? "Mustermann" : ""
  );
  const [address, setAddress] = useState(
    mode === "test" ? "Teststrasse 1" : ""
  );
  const [city, setCity] = useState(mode === "test" ? "Vienna" : "");
  const [postalCode, setPostalCode] = useState(mode === "test" ? "1010" : "");
  const [country, setCountry] = useState(mode === "test" ? "AT" : "");
  const [state, setState] = useState(mode === "test" ? "Vienna" : "");

  const [externalId, setExternalId] = useState(
    mode === "test" ? "PHONEID-DEMO-001" : ""
  );
  const [contactEmail, setContactEmail] = useState(
    mode === "test" ? "test@example.com" : ""
  );

  const [includeContactInfo, setIncludeContactInfo] = useState(mode === "test");
  const [includeBreachedData, setIncludeBreachedData] = useState(mode === "test");
  const [includeCallForwardDetection, setIncludeCallForwardDetection] =
    useState(false);
  const [includeSubscriberStatus, setIncludeSubscriberStatus] = useState(
    mode === "test"
  );
  const [includePortingStatus, setIncludePortingStatus] = useState(false);
  const [includeSimSwap, setIncludeSimSwap] = useState(mode === "test");
  const [includeNumberDeactivation, setIncludeNumberDeactivation] =
    useState(false);

  const [portingHistoryPastXDays, setPortingHistoryPastXDays] = useState(
    mode === "test" ? "30" : ""
  );
  const [ageThreshold, setAgeThreshold] = useState("");

  const [consentConfirmed, setConsentConfirmed] = useState(mode === "test");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setPhoneNumber(mode === "test" ? "+436501234567" : "");
    setFirstName(mode === "test" ? "Max" : "");
    setLastName(mode === "test" ? "Mustermann" : "");
    setAddress(mode === "test" ? "Teststrasse 1" : "");
    setCity(mode === "test" ? "Vienna" : "");
    setPostalCode(mode === "test" ? "1010" : "");
    setCountry(mode === "test" ? "AT" : "");
    setState(mode === "test" ? "Vienna" : "");

    setExternalId(mode === "test" ? "PHONEID-DEMO-001" : "");
    setContactEmail(mode === "test" ? "test@example.com" : "");

    setIncludeContactInfo(mode === "test");
    setIncludeBreachedData(mode === "test");
    setIncludeCallForwardDetection(false);
    setIncludeSubscriberStatus(mode === "test");
    setIncludePortingStatus(false);
    setIncludeSimSwap(mode === "test");
    setIncludeNumberDeactivation(false);

    setPortingHistoryPastXDays(mode === "test" ? "30" : "");
    setAgeThreshold("");

    setConsentConfirmed(mode === "test");
    setError(null);
    setSubmitted(false);
  }, [mode]);

  const needsConsent = useMemo(() => {
    return (
      includeContactInfo ||
      Boolean(contactEmail.trim()) ||
      Boolean(ageThreshold.trim())
    );
  }, [includeContactInfo, contactEmail, ageThreshold]);

  const cleaned = {
    phoneNumber: cleanPhoneInput(phoneNumber),
    firstName: cleanName(firstName),
    lastName: cleanName(lastName),
    address: cleanAddressLine(address),
    city: cleanCity(city),
    postalCode: cleanPostalCode(postalCode),
    country: cleanCountryFlexible(country),
    state: cleanState(state),
  };

  const invalid = {
    phoneNumber:
      submitted &&
      (!cleaned.phoneNumber || cleaned.phoneNumber.replace(/\D/g, "").length < 8),
    firstName: submitted && !cleaned.firstName,
    lastName: submitted && !cleaned.lastName,
    address: submitted && !cleaned.address,
    city: submitted && !cleaned.city,
    postalCode: submitted && !cleaned.postalCode,
    country: submitted && !cleaned.country,
    state: submitted && !cleaned.state,
  };

  function inputClass(isInvalid: boolean) {
    return cn(
      isInvalid &&
        "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500"
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);

    if (!cleaned.phoneNumber || cleaned.phoneNumber.replace(/\D/g, "").length < 8) {
      setError("Please enter a valid phone number including country code.");
      return;
    }

    if (
      !cleaned.firstName ||
      !cleaned.lastName ||
      !cleaned.address ||
      !cleaned.city ||
      !cleaned.postalCode ||
      !cleaned.country ||
      !cleaned.state
    ) {
      setError("Please complete all required contact match fields.");
      return;
    }

    if (portingHistoryPastXDays.trim()) {
      const n = Number(portingHistoryPastXDays);
      if (!Number.isInteger(n) || n < 1 || n > 3650) {
        setError("Porting history days must be a whole number between 1 and 3650.");
        return;
      }
    }

    if (ageThreshold.trim()) {
      const n = Number(ageThreshold);
      if (!Number.isInteger(n) || n < 1 || n > 120) {
        setError("Age threshold must be a whole number between 1 and 120.");
        return;
      }
    }

    if (needsConsent && !consentConfirmed) {
      setError("Please confirm that the required user consent exists.");
      return;
    }

    onSubmit({
      phoneNumber: cleaned.phoneNumber,
      firstName: cleaned.firstName,
      lastName: cleaned.lastName,
      address: cleaned.address,
      city: cleaned.city,
      postalCode: cleaned.postalCode,
      country: cleaned.country,
      state: cleaned.state,

      externalId: externalId.trim() ? cleanExternalId(externalId) : undefined,
      contactEmail: contactEmail.trim() ? cleanEmail(contactEmail) : undefined,

      includeContactInfo,
      includeBreachedData,
      includeCallForwardDetection,
      includeSubscriberStatus,
      includePortingStatus,
      includeSimSwap,
      includeNumberDeactivation,

      portingHistoryPastXDays: portingHistoryPastXDays.trim()
        ? String(Number(portingHistoryPastXDays))
        : undefined,
      ageThreshold: ageThreshold.trim()
        ? String(Number(ageThreshold))
        : undefined,

      consentConfirmed: needsConsent ? consentConfirmed : undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold">
          {mode === "test" ? "Test request" : "Live request"}
        </h2>
        <p className="text-xs text-muted-foreground">
          Phone ID primarily verifies whether the submitted identity and address
          details align with carrier-linked records for this phone number.
        </p>
      </div>

      <section className="space-y-3">
        <div className="text-sm font-medium">Core identity match</div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Phone number" required invalid={invalid.phoneNumber}>
            <Input
              placeholder="+436501234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(cleanPhoneInput(e.target.value))}
              className={inputClass(invalid.phoneNumber)}
            />
          </Field>

          <Field label="External ID">
            <Input
              placeholder="External ID (optional)"
              value={externalId}
              onChange={(e) => setExternalId(cleanExternalId(e.target.value))}
            />
          </Field>

          <Field label="First name" required invalid={invalid.firstName}>
            <Input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(cleanName(e.target.value))}
              className={inputClass(invalid.firstName)}
            />
          </Field>

          <Field label="Last name" required invalid={invalid.lastName}>
            <Input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(cleanName(e.target.value))}
              className={inputClass(invalid.lastName)}
            />
          </Field>

          <Field label="Address" required invalid={invalid.address}>
            <Input
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(cleanAddressLine(e.target.value))}
              className={inputClass(invalid.address)}
            />
          </Field>

          <Field label="City" required invalid={invalid.city}>
            <Input
              placeholder="City"
              value={city}
              onChange={(e) => setCity(cleanCity(e.target.value))}
              className={inputClass(invalid.city)}
            />
          </Field>

          <Field label="Postal code" required invalid={invalid.postalCode}>
            <Input
              placeholder="Postal code"
              value={postalCode}
              onChange={(e) => setPostalCode(cleanPostalCode(e.target.value))}
              className={inputClass(invalid.postalCode)}
            />
          </Field>

          <Field label="Country" required invalid={invalid.country}>
            <Input
              placeholder="Country (AT / DE / USA)"
              value={country}
              onChange={(e) => setCountry(cleanCountryFlexible(e.target.value))}
              className={inputClass(invalid.country)}
            />
          </Field>

          <Field label="State / region" required invalid={invalid.state}>
            <Input
              placeholder="State / region"
              value={state}
              onChange={(e) => setState(cleanState(e.target.value))}
              className={inputClass(invalid.state)}
            />
          </Field>

          <Field label="Email">
            <Input
              placeholder="Email (optional)"
              value={contactEmail}
              onChange={(e) => setContactEmail(cleanEmail(e.target.value))}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-sm font-medium">Additional insights</div>

        <div className="grid gap-3 md:grid-cols-2">
          <ToggleCard
            label="Contact Info"
            description={ADDON_COPY.contactInfo}
            checked={includeContactInfo}
            onChange={setIncludeContactInfo}
          />
          <ToggleCard
            label="Breached Data"
            description={ADDON_COPY.breachedData}
            checked={includeBreachedData}
            onChange={setIncludeBreachedData}
          />
          <ToggleCard
            label="Call Forwarding Detection"
            description={ADDON_COPY.callForwardDetection}
            checked={includeCallForwardDetection}
            onChange={setIncludeCallForwardDetection}
          />
          <ToggleCard
            label="Subscriber Status"
            description={ADDON_COPY.subscriberStatus}
            checked={includeSubscriberStatus}
            onChange={setIncludeSubscriberStatus}
          />
          <ToggleCard
            label="Porting Status"
            description={ADDON_COPY.portingStatus}
            checked={includePortingStatus}
            onChange={setIncludePortingStatus}
          />
          <ToggleCard
            label="SIM Swap"
            description={ADDON_COPY.simSwap}
            checked={includeSimSwap}
            onChange={setIncludeSimSwap}
          />
          <ToggleCard
            label="Number Deactivation"
            description={ADDON_COPY.numberDeactivation}
            checked={includeNumberDeactivation}
            onChange={setIncludeNumberDeactivation}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-sm font-medium">Conditional checks</div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Porting history past X days">
            <Input
              placeholder="Porting history past X days (optional)"
              value={portingHistoryPastXDays}
              onChange={(e) =>
                setPortingHistoryPastXDays(
                  e.target.value.replace(/\D/g, "").slice(0, 4)
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              {ADDON_COPY.portingHistory}
            </p>
          </Field>

          <Field label="Age threshold">
            <Input
              placeholder="Age threshold (optional)"
              value={ageThreshold}
              onChange={(e) =>
                setAgeThreshold(e.target.value.replace(/\D/g, "").slice(0, 3))
              }
            />
            <p className="text-xs text-muted-foreground">
              {ADDON_COPY.ageVerify}
            </p>
          </Field>
        </div>
      </section>

      {needsConsent && (
        <label className="flex items-start gap-3 rounded-lg border bg-muted/20 px-3 py-3 text-sm">
          <input
            type="checkbox"
            checked={consentConfirmed}
            onChange={(e) => setConsentConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            I confirm that the necessary user consent exists for the requested
            enrichment data.
          </span>
        </label>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={!phoneNumber || loading}>
        {loading ? "Running check…" : "Run Phone ID"}
      </Button>

      <div className="text-xs text-muted-foreground">
        Hidden parameters used automatically:{" "}
        <span className="font-medium">accountLifecycleEvent</span> and{" "}
        <span className="font-medium">originatingIp</span> when available.
      </div>
    </form>
  );
}