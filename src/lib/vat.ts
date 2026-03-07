// src/lib/vat.ts
import { checkVAT, countries } from "jsvat";

// Reuse your existing cleaner (or re-implement here)
export function cleanTaxId(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);
}

export type VatValidation =
  | { ok: true; normalized: string }
  | { ok: false; normalized: string; reason: string };

function getCountryDef(iso2: string) {
  const cc = String(iso2 || "").toUpperCase();
  return countries.find((c) => c?.codes?.includes(cc));
}

/**
 * Validates VAT against:
 * - Country match (billing country == VAT prefix country)
 * - Format + checksum (jsvat)
 *
 * Notes:
 * - Many EU VATs include the country prefix (DE..., FR..., ATU...).
 * - If user enters VAT without prefix (digits only), we prepend billing country.
 */
export function validateVatForCountry(
  rawVat: string | undefined | null,
  billingCountryISO2: string
): VatValidation {
  const country = String(billingCountryISO2 || "").toUpperCase();
  const def = getCountryDef(country);

  const cleaned = cleanTaxId(String(rawVat ?? ""));
  if (!cleaned) return { ok: true, normalized: "" }; // VAT optional in your UI
  if (!def) {
    return { ok: false, normalized: cleaned, reason: `Unsupported VAT country: ${country}` };
  }

  // If the VAT starts with 2 letters, enforce they match the billing country.
  // Otherwise, assume user omitted prefix and prepend it.
  let candidate = cleaned;

  const startsWith2Letters = /^[A-Z]{2}/.test(candidate);
  if (startsWith2Letters) {
    const prefix = candidate.slice(0, 2);
    if (prefix !== country) {
      return {
        ok: false,
        normalized: candidate,
        reason: `VAT country (${prefix}) does not match billing country (${country}).`,
      };
    }
  } else {
    candidate = `${country}${candidate}`;
  }

  // Main validation: match + checksum for ONLY that country
  const result = checkVAT(candidate, [def]);

  if (!result.isSupportedCountry || !result.country?.isoCode?.short) {
    return { ok: false, normalized: candidate, reason: "VAT country is not supported." };
  }

  if (result.country.isoCode.short !== country) {
    return {
      ok: false,
      normalized: candidate,
      reason: `VAT country (${result.country.isoCode.short}) does not match billing country (${country}).`,
    };
  }

  if (!result.isValid) {
    // isValidFormat might be true even if checksum fails
    return {
      ok: false,
      normalized: candidate,
      reason: result.isValidFormat
        ? "VAT format looks correct, but checksum is invalid."
        : "VAT format is invalid.",
    };
  }

  return { ok: true, normalized: result.value ?? candidate };
}