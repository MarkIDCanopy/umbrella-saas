// src/lib/services/mappers/otpVerification.ts
export type OtpMethod = "sms" | "email";

export type OtpStartPayload = {
  method: OtpMethod;
  phoneNumber?: string;
  email?: string;
  externalId?: string;
  securityFactor?: string;
};

export type OtpMatchPayload = {
  referenceId: string;
  securityFactor: string;
};

export type OtpStartResponse = {
  kind: "start";
  status: boolean;
  referenceId: string | null;
  mobileAppToken: string | null;
  recipient: {
    phoneNumber: string | null;
    email: string | null;
  };
  state: string | null;
  statusCode: number | null;
  statusDescription: string | null;
  statusUpdatedOn: string | null;
  raw: any;
};

export type OtpMatchResponse = {
  kind: "match";
  status: boolean;
  referenceId: string | null;
  verified: boolean;
  state: string | null;
  statusCode: number | null;
  statusDescription: string | null;
  raw: any;
};

export type OtpResponse = OtpStartResponse | OtpMatchResponse;

function firstNonEmpty<T = any>(...values: any[]): T | null {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") {
      return value as T;
    }
  }
  return null;
}

function toFiniteNumber(value: any): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function isVerified(raw: any): boolean {
  const root = raw ?? {};
  const data = root?.data ?? {};

  const state = String(firstNonEmpty(data?.state, root?.state) ?? "").toUpperCase();
  const code = toFiniteNumber(firstNonEmpty(data?.status?.code, root?.status?.code));
  const description = String(
    firstNonEmpty(data?.status?.description, root?.status?.description) ?? ""
  ).toLowerCase();

  return state === "VERIFIED" || code === 3900 || description.includes("verified");
}

export function mapOtpStartResponse(raw: any): OtpStartResponse {
  const root = raw ?? {};
  const data = root?.data ?? {};

  return {
    kind: "start",
    status: Boolean(root?.status ?? false),
    referenceId: firstNonEmpty(data?.referenceId, root?.referenceId),
    mobileAppToken: firstNonEmpty(data?.mobileAppToken, root?.mobileAppToken),
    recipient: {
      phoneNumber: firstNonEmpty(
        data?.recipient?.phoneNumber,
        root?.recipient?.phoneNumber
      ),
      email: firstNonEmpty(data?.recipient?.email, root?.recipient?.email),
    },
    state: firstNonEmpty(data?.state, root?.state),
    statusCode: toFiniteNumber(firstNonEmpty(data?.status?.code, root?.status?.code)),
    statusDescription: firstNonEmpty(
      data?.status?.description,
      root?.status?.description,
      root?.message,
      root?.error
    ),
    statusUpdatedOn: firstNonEmpty(
      data?.status?.updatedOn,
      root?.status?.updatedOn
    ),
    raw,
  };
}

export function mapOtpMatchResponse(
  raw: any,
  fallbackReferenceId?: string
): OtpMatchResponse {
  const root = raw ?? {};
  const data = root?.data ?? {};

  return {
    kind: "match",
    status: Boolean(root?.status ?? false),
    referenceId: firstNonEmpty(
      data?.referenceId,
      root?.referenceId,
      fallbackReferenceId
    ),
    verified: isVerified(raw),
    state: firstNonEmpty(data?.state, root?.state),
    statusCode: toFiniteNumber(firstNonEmpty(data?.status?.code, root?.status?.code)),
    statusDescription: firstNonEmpty(
      data?.status?.description,
      root?.status?.description,
      root?.message,
      root?.error
    ),
    raw,
  };
}

export function mapOtpTxnResponse(providerBody: any): OtpResponse {
  const data = providerBody?.data ?? providerBody ?? {};

  const looksLikeStart =
    data?.referenceId != null ||
    data?.mobileAppToken != null ||
    data?.recipient != null;

  return looksLikeStart
    ? mapOtpStartResponse(providerBody)
    : mapOtpMatchResponse(providerBody);
}

export function extractOtpProviderError(raw: any): string | null {
  return firstNonEmpty(
    raw?.error,
    raw?.message,
    raw?.data?.message,
    raw?.data?.error,
    raw?.details,
    raw?.raw,
    raw?.data?.status?.description,
    raw?.status?.description
  );
}