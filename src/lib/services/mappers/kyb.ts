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

export function mapKybSearchResponse(raw: any): KybSearchResponse {
  const data = raw?.data ?? raw ?? {};

  const companiesSource = firstArray(
    data?.companies,
    data?.results,
    data?.matches,
    data?.items,
    raw?.companies,
    raw?.results
  );

  const companies: KybSearchItem[] = companiesSource.map((item: any) => ({
    companyId: firstNonEmpty(
      item?.companyId,
      item?.id,
      item?.company?.companyId,
      item?.company?.id
    ),
    name: firstNonEmpty(item?.name, item?.companyName, item?.company?.name),
    country: firstNonEmpty(
      item?.country,
      item?.countryName,
      item?.address?.country,
      item?.company?.country
    ),
    countryCode: firstNonEmpty(item?.countryCode, item?.countryIso2, item?.iso2),
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
    data?.transactionId,
    raw?.transactionId,
    data?.searchTransactionId
  );

  return {
    kind: "company-search",
    status: Boolean(raw?.status ?? true),
    transactionId: txId,
    resultCount: toFiniteNumber(data?.count) ?? companies.length,
    companies,
    raw,
  };
}

export function mapKybAdvancedResponse(raw: any): KybAdvancedResponse {
  const data = raw?.data ?? raw ?? {};
  const company = data?.company ?? data?.details ?? data?.profile ?? data ?? {};

  return {
    kind: "advanced-search",
    status: Boolean(raw?.status ?? true),
    transactionId: firstNonEmpty(
      data?.transactionId,
      raw?.transactionId,
      company?.transactionId
    ),
    companyId: firstNonEmpty(
      company?.companyId,
      company?.id,
      data?.companyId,
      raw?.companyId
    ),
    companySummary: {
      companyId: firstNonEmpty(company?.companyId, company?.id, data?.companyId),
      name: firstNonEmpty(company?.name, company?.companyName),
      country: firstNonEmpty(company?.country, company?.countryName),
      countryCode: firstNonEmpty(company?.countryCode, company?.countryIso2),
      registrationNumber: firstNonEmpty(
        company?.registrationNumber,
        company?.companyNumber,
        company?.registrationNo
      ),
      status: firstNonEmpty(company?.status, company?.companyStatus),
      legalForm: firstNonEmpty(company?.legalForm, company?.type),
      incorporatedOn: firstNonEmpty(
        company?.incorporatedOn,
        company?.incorporationDate,
        company?.foundingDate
      ),
      website: firstNonEmpty(company?.website, company?.url),
    },
    officers: firstArray(data?.officers, company?.officers),
    addresses: firstArray(data?.addresses, company?.addresses),
    ownerships: firstArray(data?.ownerships, company?.ownerships),
    transparency: firstNonEmpty(data?.transparency, company?.transparency),
    documents: firstArray(data?.documents, company?.documents),
    financials: firstArray(data?.financials, company?.financials),
    raw,
  };
}

export function mapKybTxnResponse(providerBody: any): KybResponse {
  const data = providerBody?.data ?? providerBody ?? {};

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