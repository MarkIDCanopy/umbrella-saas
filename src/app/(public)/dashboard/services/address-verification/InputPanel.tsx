// src/app/(public)/dashboard/services/address-verification/InputPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";
import {
  formatDobUi,
  convertUiDobToApiDob,
  isValidDobUi,
  cleanName,
  cleanCountry,
} from "@/lib/input-safeguards";

export type AddressVerifyPayload = {
  country: string;
  address: {
    street: string;
    number: string;
    zip: string;
    city: string;
    province?: string;
  };
  identity: {
    firstname: string;
    lastname: string;
    dob?: string;
  };
};

type FormState = {
  country: string;
  street: string;
  number: string;
  zip: string;
  city: string;
  province: string;
  firstname: string;
  lastname: string;
  dob: string;
};

const TEST_DEFAULT: FormState = {
  country: "AT",
  street: "Kampgasse",
  number: "9",
  zip: "3492",
  city: "Etsdorf",
  province: "",
  firstname: "Joe",
  lastname: "Cardholder",
  dob: "01-12-2000",
};

const EMPTY_FORM: FormState = {
  country: "",
  street: "",
  number: "",
  zip: "",
  city: "",
  province: "",
  firstname: "",
  lastname: "",
  dob: "",
};

type Props = {
  mode: EnvironmentMode;
  onSubmit: (payload: AddressVerifyPayload) => void;
  onCountryChange?: (country: string) => void;

  buttonCostCredits?: number;
  buttonCostLabelPrefix?: string; // "Cost" | "From"
};

export function AddressInputPanel({
  mode,
  onSubmit,
  onCountryChange,
  buttonCostCredits,
  buttonCostLabelPrefix = "Cost",
}: Props) {
  const [form, setForm] = useState<FormState>(
    mode === "test" ? TEST_DEFAULT : EMPTY_FORM
  );

  useEffect(() => {
    if (mode === "test") {
      const formattedDob = formatDobUi(TEST_DEFAULT.dob.replace(/\//g, "-"));
      setForm({ ...TEST_DEFAULT, dob: formattedDob });
      onCountryChange?.(TEST_DEFAULT.country);
    } else {
      setForm(EMPTY_FORM);
      onCountryChange?.("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const dobStr = convertUiDobToApiDob(form.dob);

    const payload: AddressVerifyPayload = {
      country: form.country,
      address: {
        street: form.street,
        number: form.number,
        zip: form.zip,
        city: form.city,
        province: form.province,
      },
      identity: {
        firstname: form.firstname,
        lastname: form.lastname,
        dob: dobStr || "",
      },
    };

    onSubmit(payload);
  }

  const isTest = mode === "test";

  const allRequiredFilled = Boolean(
    form.firstname &&
      form.lastname &&
      form.street &&
      form.number &&
      form.zip &&
      form.city &&
      form.country
  );

  const disabled = !isTest && !allRequiredFilled;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border bg-card p-6"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">
          {isTest ? "Test request" : "Live verification request"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {isTest
            ? "Use realistic data to preview the verification protocol. No credits are consumed."
            : "Provide full residential address and identity data. Required fields must be accurate for a successful match."}
        </p>
      </div>

      {/* IDENTITY */}
      <div className="space-y-4">
        <div className="text-sm font-medium text-muted-foreground">Identity</div>
        <div className="space-y-3">
          <Input
            placeholder="First name"
            value={form.firstname}
            onChange={(e) => updateField("firstname", cleanName(e.target.value))}
          />
          <Input
            placeholder="Last name"
            value={form.lastname}
            onChange={(e) => updateField("lastname", cleanName(e.target.value))}
          />
          <Input
            placeholder="DOB (DD-MM-YYYY)"
            value={form.dob}
            onChange={(e) => updateField("dob", formatDobUi(e.target.value))}
            className={
              form.dob.length > 0 && !isValidDobUi(form.dob) ? "border-red-500" : ""
            }
          />
          {form.dob.length > 0 && !isValidDobUi(form.dob) && (
            <p className="text-xs text-red-500">Invalid date of birth</p>
          )}
        </div>
      </div>

      {/* ADDRESS */}
      <div className="space-y-4">
        <div className="text-sm font-medium text-muted-foreground">Address</div>
        <div className="space-y-3">
          <Input
            placeholder="Street"
            value={form.street}
            onChange={(e) => updateField("street", e.target.value)}
          />
          <Input
            placeholder="House number"
            value={form.number}
            onChange={(e) => updateField("number", e.target.value)}
          />
          <Input
            placeholder="ZIP code"
            value={form.zip}
            onChange={(e) => updateField("zip", e.target.value)}
          />
          <Input
            placeholder="City"
            value={form.city}
            onChange={(e) => updateField("city", e.target.value)}
          />
          <Input
            placeholder="Country (ISO, e.g. AT)"
            value={form.country}
            onChange={(e) => {
              const v = cleanCountry(e.target.value);
              updateField("country", v);
              onCountryChange?.(v);
            }}
          />
          <Input
            placeholder="Province / state (optional)"
            value={form.province}
            onChange={(e) => updateField("province", e.target.value)}
          />
        </div>
      </div>

      {/* SUBMIT + COST NOTE */}
      <div className="space-y-2">
        {!isTest &&
          typeof buttonCostCredits === "number" &&
          buttonCostCredits > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 w-full">
              <b>{buttonCostLabelPrefix}:</b>{" "}
              <span className="font-semibold">{buttonCostCredits} credits</span>
            </div>
          )}

        <Button
          type="submit"
          className="w-full disabled:opacity-50 disabled:pointer-events-none"
          disabled={disabled}
        >
          {isTest ? "Run test verification" : "Verify address"}
        </Button>
      </div>
    </form>
  );
}
