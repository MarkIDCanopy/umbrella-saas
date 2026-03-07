// src/components/billing/BillingSetupForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { BillingMode } from "@/components/billing/BillingModeToggle";
import type { BillingProfileSummary } from "@/components/billing/BillingOverview";
import {
  CountrySelect,
  normalizeCountryToISO2,
} from "@/components/ui/CountrySelect";

import {
  cleanBillingName,
  cleanEmail,
  cleanAddressLine,
  cleanCity,
  cleanPostalCode,
  cleanTaxId,
} from "@/lib/input-safeguards";

import { validateVatForCountry } from "@/lib/vat"; // ✅ add

type BillingSetupFormProps = {
  mode: BillingMode;
  onModeChange: (mode: BillingMode) => void;
  onCancel: () => void;
  onComplete: () => void | Promise<void>;
  isOrgContext: boolean;
  initialBilling?: BillingProfileSummary | null;
};

type ApiErr = { error?: string; code?: string; raw?: string } | null;

async function readApiError(res: Response): Promise<ApiErr> {
  const ct = res.headers.get("content-type") || "";
  const raw = await res.clone().text().catch(() => "");

  if (ct.includes("application/json")) {
    try {
      const data = raw ? JSON.parse(raw) : null;
      if (data && typeof data === "object") return { ...data, raw };
      return { error: raw || `Request failed (${res.status})`, raw };
    } catch {
      return { error: raw || `Request failed (${res.status})`, raw };
    }
  }

  if (raw) return { error: raw, raw };
  return { error: `Request failed (${res.status})`, raw: "" };
}

type OrgRole = "owner" | "admin" | "user" | "viewer" | "personal" | null;

export function BillingSetupForm({
  mode,
  onModeChange,
  onCancel,
  onComplete,
  isOrgContext,
  initialBilling,
}: BillingSetupFormProps) {
  const [name, setName] = useState(initialBilling?.name ?? "");
  const [email, setEmail] = useState(initialBilling?.email ?? "");
  const [address1, setAddress1] = useState(initialBilling?.addressLine1 ?? "");
  const [address2, setAddress2] = useState(initialBilling?.addressLine2 ?? "");
  const [city, setCity] = useState(initialBilling?.city ?? "");
  const [postalCode, setPostalCode] = useState(initialBilling?.postalCode ?? "");
  const [country, setCountry] = useState(
    normalizeCountryToISO2(initialBilling?.country) || "AT"
  );
  const [taxId, setTaxId] = useState(initialBilling?.taxId ?? "");
  const [userFullName, setUserFullName] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // org role check (to avoid 403 surprise)
  const [orgRole, setOrgRole] = useState<OrgRole>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  const isEdit = !!initialBilling;

  // Load org role (only relevant in org context)
  useEffect(() => {
    if (!isOrgContext) {
      setOrgRole("personal");
      return;
    }

    let cancelled = false;
    setRoleLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/organizations/current/role", {
          cache: "no-store",
        });

        if (!res.ok) {
          if (!cancelled) setOrgRole(null);
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        const role = (data?.role ?? null) as OrgRole;
        setOrgRole(role);
      } catch {
        if (!cancelled) setOrgRole(null);
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOrgContext]);

  const isOrgBlocked = useMemo(() => {
    if (!isOrgContext) return false;
    if (roleLoading) return true;
    if (!orgRole) return true;
    return !["owner", "admin"].includes(orgRole);
  }, [isOrgContext, orgRole, roleLoading]);

  // Prefill from /api/me ONLY when creating (no initialBilling)
  useEffect(() => {
    if (isEdit) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json().catch(() => ({}));
        if (!data?.user || cancelled) return;

        const fullName: string = data.user.full_name || "";
        setUserFullName(fullName || null);

        setEmail((prev) => prev || data.user.email || "");
        setName((prev) => prev || fullName || "");

        const userCountryRaw: string | undefined = data.user.country || undefined;
        const userCountry = normalizeCountryToISO2(userCountryRaw);
        if (userCountry) setCountry(userCountry);
      } catch (e) {
        console.error("Failed to prefill billing from /api/me", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  // Prefill company name from org ONLY when creating + org context OR when user picked company
  useEffect(() => {
    if (isEdit) return;
    if (mode !== "company") return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/organizations/current", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        const orgName: string | undefined = data?.organization?.name;
        if (!orgName) return;

        if (!name || name === userFullName) setName(orgName);
      } catch (e) {
        console.error("Failed to prefill org name for billing", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, mode, name, userFullName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (isOrgContext && isOrgBlocked) {
      setErrorMsg(
        roleLoading
          ? "Checking your organization permissions…"
          : "Only organization owners/admins can set billing for this organization."
      );
      return;
    }

    setSubmitting(true);

    const cleanedName = cleanBillingName(name);
    const cleanedEmail = cleanEmail(email);
    const cleanedA1 = cleanAddressLine(address1);
    const cleanedA2 = address2 ? cleanAddressLine(address2) : "";
    const cleanedCity = cleanCity(city);
    const cleanedPostal = cleanPostalCode(postalCode);
    const cleanedTax = cleanTaxId(taxId);

    if (!cleanedName || cleanedName.length < 2) {
      setErrorMsg("Please enter a valid name.");
      setSubmitting(false);
      return;
    }
    if (!cleanedEmail) {
      setErrorMsg("Please enter a valid billing email.");
      setSubmitting(false);
      return;
    }
    if (!cleanedA1 || cleanedA1.length < 3) {
      setErrorMsg("Please enter a valid address.");
      setSubmitting(false);
      return;
    }
    if (!cleanedCity || cleanedCity.length < 2) {
      setErrorMsg("Please enter a valid city.");
      setSubmitting(false);
      return;
    }
    if (!cleanedPostal || cleanedPostal.length < 3) {
      setErrorMsg("Please enter a valid postal code.");
      setSubmitting(false);
      return;
    }

    // ✅ VAT validation (client-side)
    let normalizedVatToSend: string | undefined = undefined;
    if (mode === "company" && cleanedTax) {
      const v = validateVatForCountry(cleanedTax, country);
      if (!v.ok) {
        setErrorMsg(v.reason);
        setSubmitting(false);
        return;
      }
      normalizedVatToSend = v.normalized;
    }

    try {
      const res = await fetch("/api/billing/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          billingName: cleanedName,
          billingEmail: cleanedEmail,
          addressLine1: cleanedA1,
          addressLine2: cleanedA2 || undefined,
          city: cleanedCity,
          postalCode: cleanedPostal,
          country,
          taxId: mode === "company" ? normalizedVatToSend : undefined, // ✅ send normalized
        }),
      });

      if (!res.ok) {
        const payload = await readApiError(res);

        console.error("Billing setup failed", {
          status: res.status,
          statusText: res.statusText,
          contentType: res.headers.get("content-type"),
          body: payload,
        });

        setErrorMsg(payload?.error || payload?.raw || "Billing setup failed.");
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      await onComplete();
    } catch (err) {
      console.error("Billing setup request crashed", err);
      setErrorMsg("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const nameLabel = mode === "company" ? "Company name" : "Full name";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up billing</CardTitle>
        <CardDescription>
          {isOrgContext
            ? "Billing will be linked to your organization. Invoices will be issued to the company."
            : "Choose whether you want to use personal or company billing and enter your billing details."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Billing type</h3>
            <p className="text-xs text-muted-foreground">
              {isOrgContext
                ? "You are currently working in an organization. Billing for this context is always company-based."
                : "Use personal for individual purchases, or company for invoices with VAT / tax details."}
            </p>
          </div>

          {!isOrgContext ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "personal" ? "default" : "outline"}
                onClick={() => onModeChange("personal")}
              >
                Personal
              </Button>
              <Button
                type="button"
                variant={mode === "company" ? "default" : "outline"}
                onClick={() => onModeChange("company")}
              >
                Company
              </Button>
            </div>
          ) : (
            <p className="text-xs font-medium text-muted-foreground">
              Company billing is enforced for this organization.
            </p>
          )}
        </div>

        {isOrgContext && (
          <div className="rounded-xl border bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {roleLoading ? (
              <>Checking your organization permissions…</>
            ) : orgRole && ["owner", "admin"].includes(orgRole) ? (
              <>You have permission to manage organization billing.</>
            ) : (
              <>
                Only organization owners/admins can set billing for this organization.
                Please ask an admin to complete billing setup.
              </>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="billing-name">{nameLabel}</Label>
              <Input
                id="billing-name"
                value={name}
                onChange={(e) => setName(cleanBillingName(e.target.value))}
                required
                maxLength={80}
                disabled={submitting || (isOrgContext && isOrgBlocked)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="billing-email">Billing email</Label>
              <Input
                id="billing-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(cleanEmail(e.target.value))}
                required
                maxLength={254}
                disabled={submitting || (isOrgContext && isOrgBlocked)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="billing-address1">Address line 1</Label>
            <Input
              id="billing-address1"
              value={address1}
              onChange={(e) => setAddress1(cleanAddressLine(e.target.value))}
              required
              maxLength={120}
              disabled={submitting || (isOrgContext && isOrgBlocked)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="billing-address2">Address line 2 (optional)</Label>
            <Input
              id="billing-address2"
              value={address2}
              onChange={(e) => setAddress2(cleanAddressLine(e.target.value))}
              maxLength={120}
              disabled={submitting || (isOrgContext && isOrgBlocked)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1 md:col-span-1">
              <Label htmlFor="billing-city">City</Label>
              <Input
                id="billing-city"
                value={city}
                onChange={(e) => setCity(cleanCity(e.target.value))}
                required
                maxLength={60}
                disabled={submitting || (isOrgContext && isOrgBlocked)}
              />
            </div>

            <div className="space-y-1 md:col-span-1">
              <Label htmlFor="billing-postal">Postal code</Label>
              <Input
                id="billing-postal"
                value={postalCode}
                onChange={(e) => setPostalCode(cleanPostalCode(e.target.value))}
                required
                maxLength={16}
                disabled={submitting || (isOrgContext && isOrgBlocked)}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label>Country</Label>

              <div className="relative">
                <CountrySelect value={country} onChange={setCountry} />

                {(submitting || (isOrgContext && isOrgBlocked)) && (
                  <div
                    className="absolute inset-0 z-10 cursor-not-allowed rounded-md bg-transparent pointer-events-auto"
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
          </div>

          {mode === "company" && (
            <div className="space-y-1">
              <Label htmlFor="billing-tax">Tax / VAT ID</Label>
              <Input
                id="billing-tax"
                placeholder="ATU12345678"
                value={taxId}
                onChange={(e) => setTaxId(cleanTaxId(e.target.value))}
                maxLength={20}
                inputMode="text"
                autoCapitalize="characters"
                disabled={submitting || (isOrgContext && isOrgBlocked)}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <p className="text-xs text-muted-foreground">
              Billing details are saved to your Umbrella account. You&apos;ll only be asked
              for payment when you buy credits.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || (isOrgContext && isOrgBlocked)}>
                {submitting ? "Saving..." : roleLoading && isOrgContext ? "Checking…" : "Save"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}