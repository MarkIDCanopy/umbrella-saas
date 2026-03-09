// src/lib/services/mappers/kyb.ts
export type KybMode = "company-search" | "advanced-search";

export type KybIncludeOptions = {
  officers: boolean;
  addresses: boolean;
  ownerships: boolean;
  transparency: boolean;
  documents: boolean;
  financials: boolean;
};

export type KybCompanySearchPayload = {
  name: string;
  country?: string;
};

export type KybAdvancedSearchPayload = {
  transactionId: string;
  companyId: string;
  include: KybIncludeOptions;
};

export type KybSearchItem = {
  transactionId: string | null;
  companyId: string | null;
  name: string | null;
  country: string | null;
  countryCode: string | null;
  registrationNumber: string | null;
  status: string | null;
  address: string | null;
  legalForm: string | null;
  score: number | null;
  raw: any;
};

export type KybSearchResponse = {
  kind: "company-search";
  status: boolean;
  transactionId: string | null;
  resultCount: number;
  companies: KybSearchItem[];
  raw: any;
};

export type KybAdvancedResponse = {
  kind: "advanced-search";
  status: boolean;
  transactionId: string | null;
  companyId: string | null;
  companySummary: {
    companyId: string | null;
    name: string | null;
    country: string | null;
    countryCode: string | null;
    registrationNumber: string | null;
    status: string | null;
    legalForm: string | null;
    incorporatedOn: string | null;
    website: string | null;
  };
  officers: any[];
  addresses: any[];
  ownerships: any[];
  transparency: any | null;
  documents: any[];
  financials: any[];
  raw: any;
};

export type KybResponse = KybSearchResponse | KybAdvancedResponse;

function firstNonEmpty<T = any>(...values: any[]): T | null {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") {
      return value as T;
    }
  }
  return null;
}

function firstArray(...values: any[]): any[] {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function toFiniteNumber(value: any): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickRegistrationNumber(identifiers: any): string | null {
  if (!Array.isArray(identifiers)) return null;

  const registrationIdentifier = identifiers.find(
    (item: any) => item?.scheme === "REGISTRATION_NUMBER" && item?.value
  );

  if (registrationIdentifier?.value) return registrationIdentifier.value;

  const firstWithValue = identifiers.find((item: any) => item?.value);
  return firstWithValue?.value ?? null;
}

function hasAddressContent(address: any): boolean {
  if (!address || typeof address !== "object") return false;
  if (address.singleLine) return true;

  const s = address.structured;
  return Boolean(
    s?.line1 || s?.line2 || s?.city || s?.postalCode || s?.region || s?.country
  );
}

export function mapKybSearchResponse(raw: any): KybSearchResponse {
  const root = raw ?? {};
  const data = root?.data ?? root ?? {};

  const companiesSource = firstArray(
    Array.isArray(data) ? data : null,
    data?.companies,
    data?.results,
    data?.matches,
    data?.items,
    root?.companies,
    root?.results,
    root?.matches
  );

  const companies: KybSearchItem[] = companiesSource.map((item: any) => ({
    transactionId: firstNonEmpty(
      item?.transactionId,
      item?.searchTransactionId,
      root?.transactionId
    ),
    companyId: firstNonEmpty(
      item?.companyId,
      item?.id,
      item?.company?.companyId,
      item?.company?.id
    ),
    name: firstNonEmpty(
      item?.name,
      item?.companyName,
      item?.legalName,
      item?.company?.name,
      item?.company?.legalName
    ),
    country: firstNonEmpty(
      item?.countryName,
      item?.country,
      item?.address?.country,
      item?.company?.country
    ),
    countryCode: firstNonEmpty(
      item?.countryCode,
      item?.countryIso2,
      item?.iso2,
      item?.country
    ),
    registrationNumber: firstNonEmpty(
      item?.registrationNumber,
      item?.companyNumber,
      item?.registrationNo
    ),
    status: firstNonEmpty(item?.status, item?.companyStatus),
    address: firstNonEmpty(
      item?.address,
      item?.registeredAddress,
      item?.addressLine
    ),
    legalForm: firstNonEmpty(item?.legalForm, item?.type),
    score: toFiniteNumber(item?.score),
    raw: item,
  }));

  const txId = firstNonEmpty<string>(
    root?.transactionId,
    data?.transactionId,
    data?.searchTransactionId,
    companies[0]?.transactionId
  );

  return {
    kind: "company-search",
    status: Boolean(root?.status ?? true),
    transactionId: txId,
    resultCount:
      toFiniteNumber(root?.resultCount) ??
      toFiniteNumber(data?.resultCount) ??
      toFiniteNumber(data?.count) ??
      companies.length,
    companies,
    raw,
  };
}

export function mapKybAdvancedResponse(raw: any): KybAdvancedResponse {
  const root = raw ?? {};
  const data = root?.data ?? root ?? {};
  const primary = Array.isArray(data) ? (data[0] ?? {}) : data;

  const company =
    primary?.company ??
    data?.company ??
    primary?.details ??
    data?.details ??
    primary?.profile ??
    data?.profile ??
    primary ??
    {};

  const addresses = [
    ...(hasAddressContent(company?.registeredAddress)
      ? [{ type: "registered", ...company.registeredAddress }]
      : []),
    ...(hasAddressContent(company?.businessAddress)
      ? [{ type: "business", ...company.businessAddress }]
      : []),
    ...firstArray(primary?.addresses, data?.addresses, company?.addresses),
  ];

  return {
    kind: "advanced-search",
    status: Boolean(root?.status ?? true),
    transactionId: firstNonEmpty(
      primary?.transactionId,
      data?.transactionId,
      root?.transactionId,
      company?.transactionId
    ),
    companyId: firstNonEmpty(
      primary?.companyId,
      company?.companyId,
      company?.id,
      data?.companyId,
      root?.companyId
    ),
    companySummary: {
      companyId: firstNonEmpty(
        primary?.companyId,
        company?.companyId,
        company?.id,
        data?.companyId
      ),
      name: firstNonEmpty(
        company?.legalName,
        company?.name,
        company?.companyName
      ),
      country: firstNonEmpty(company?.countryName, company?.country),
      countryCode: firstNonEmpty(
        company?.countryCode,
        company?.countryIso2,
        company?.country
      ),
      registrationNumber: firstNonEmpty(
        company?.registrationNumber,
        company?.companyNumber,
        company?.registrationNo,
        pickRegistrationNumber(company?.identifiers)
      ),
      status: firstNonEmpty(company?.status, company?.companyStatus),
      legalForm: firstNonEmpty(
        company?.legalForm,
        company?.type,
        company?.companyType?.native?.value,
        company?.companyType?.modeled?.value
      ),
      incorporatedOn: firstNonEmpty(
        company?.incorporatedOn,
        company?.incorporationDate,
        company?.registrationDate,
        company?.foundingDate
      ),
      website: firstNonEmpty(company?.website, company?.url),
    },
    officers: firstArray(primary?.officers, data?.officers, company?.officers),
    addresses,
    ownerships: firstArray(
      primary?.ownerships,
      data?.ownerships,
      company?.ownerships,
      company?.ownership,
      company?.relationships?.ultimateBeneficialOwners,
      company?.relationships?.familyTree
    ),
    transparency: firstNonEmpty(
      primary?.transparency,
      data?.transparency,
      company?.transparency,
      company?.relationships?.transparencyRegister
    ),
    documents: firstArray(
      primary?.documents,
      data?.documents,
      company?.documents,
      company?.resources
    ),
    financials: firstArray(
      primary?.financials,
      data?.financials,
      company?.financials
    ),
    raw,
  };
}

export function mapKybTxnResponse(providerBody: any): KybResponse {
  const data = providerBody?.data ?? providerBody ?? {};

  if (Array.isArray(data)) {
    const firstItem = data[0];
    return firstItem?.company
      ? mapKybAdvancedResponse(providerBody)
      : mapKybSearchResponse(providerBody);
  }

  const looksLikeSearch =
    Array.isArray(data?.companies) ||
    Array.isArray(data?.results) ||
    Array.isArray(data?.matches) ||
    Array.isArray(providerBody?.companies) ||
    Array.isArray(providerBody?.results);

  return looksLikeSearch
    ? mapKybSearchResponse(providerBody)
    : mapKybAdvancedResponse(providerBody);
}

export function extractKybProviderError(raw: any): string | null {
  return firstNonEmpty(
    raw?.error,
    raw?.message,
    raw?.data?.message,
    raw?.data?.error,
    raw?.details,
    raw?.raw
  );
}