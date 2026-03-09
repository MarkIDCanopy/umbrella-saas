// -------------------------------
// GENERIC INPUT SAFEGUARDS
// -------------------------------

// Clean human names
export function cleanName(value: string) {
  return value
    .replace(/[^a-zA-ZÀ-žß ]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

// Clean ISO country codes (AT, CH, DE…)
export function cleanCountry(value: string) {
  return value.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
}

// Clean ZIP (digits only)
export function cleanZip(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

// -------------------------------
// DOB HANDLING (UI = DD-MM-YYYY)
// -------------------------------

// Format while typing -> DD-MM-YYYY
export function formatDobUi(value: string) {
  let v = value.replace(/\D/g, "");

  if (v.length >= 3) v = v.slice(0, 2) + "-" + v.slice(2);
  if (v.length >= 6) v = v.slice(0, 5) + "-" + v.slice(5);

  return v.slice(0, 10);
}

// Convert UI --> API (YYYY/MM/DD)
export function convertUiDobToApiDob(uiDob: string) {
  const [dd, mm, yyyy] = uiDob.split("-");
  if (!dd || !mm || !yyyy) return "";
  return `${yyyy}/${mm}/${dd}`;
}

// Validate DD-MM-YYYY
export function isValidDobUi(dob: string): boolean {
  const [ddStr, mmStr, yyyyStr] = dob.split("-");
  const dd = Number(ddStr);
  const mm = Number(mmStr);
  const yyyy = Number(yyyyStr);

  if (!dd || !mm || !yyyy) return false;

  // Year bounds
  const currentYear = new Date().getFullYear();
  if (yyyy < 1900 || yyyy > currentYear) return false;

  // Month bounds
  if (mm < 1 || mm > 12) return false;

  // Valid day for month (handles leap years)
  const maxDay = new Date(yyyy, mm, 0).getDate();
  if (dd < 1 || dd > maxDay) return false;

  const date = new Date(yyyy, mm - 1, dd);
  if (isNaN(date.getTime())) return false;

  // Reject future DOBs
  if (date > new Date()) return false;

  return true;
}


// -------------------------------
// BILLING INPUT SAFEGUARDS
// -------------------------------

// Basic email: trim + collapse spaces (don't aggressively "clean" emails)
export function cleanEmail(value: string) {
  return value.trim().replace(/\s+/g, "");
}

// Company / full name:
// allow letters (incl accents), numbers, spaces, and common legal punctuation
// (.,-&()/')
export function cleanBillingName(value: string) {
  return value
    .replace(/[^\p{L}\p{N} .,&\-()'\/]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

// Address lines:
// allow letters/numbers, spaces, and common address punctuation
// . , - # / ' ( ) + : ;
export function cleanAddressLine(value: string) {
  return value
    .replace(/[^\p{L}\p{N} .,\-#\/'()+:;]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

// City:
// letters (incl accents), numbers (some cities include districts), spaces, - ' .
export function cleanCity(value: string) {
  return value
    .replace(/[^\p{L}\p{N} .\-']/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

// Postal code:
// keep digits + letters + space + dash (covers EU/UK/CA styles)
// If you want digits-only for some countries, do that conditionally.
export function cleanPostalCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9 \-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
}

// VAT/Tax ID:
// uppercase, alnum only (common expectation), max 20 chars
export function cleanTaxId(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);
}

// Phone input for UI:
// keep digits and a single leading +
// user can paste spaces/brackets/dashes; we normalize that away
export function cleanPhoneInput(value: string) {
  let v = value.replace(/[^\d+]/g, "");

  if (v.startsWith("+")) {
    v = "+" + v.slice(1).replace(/\+/g, "");
  } else {
    v = v.replace(/\+/g, "");
  }

  return v.slice(0, 20);
}

// Provider expects no spaces/symbols
export function normalizePhoneNumberForProvider(value: string) {
  return cleanPhoneInput(value).replace(/\D/g, "").slice(0, 20);
}

// External ID
export function cleanExternalId(value: string) {
  return value.replace(/[^\p{L}\p{N}._\-]/gu, "").slice(0, 80);
}

// State / region
export function cleanState(value: string) {
  return value
    .replace(/[^\p{L}\p{N} .\-']/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

// Country field for provider inputs like AT / DE / USA
export function cleanCountryFlexible(value: string) {
  return value
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 3);
}

export function cleanOtpCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function cleanReferenceId(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 100);
}