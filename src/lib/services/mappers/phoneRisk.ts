// src/lib/services/mappers/phoneRisk.ts
import { explainRiskScore, mapReasonCodes } from "@/lib/services/phoneRiskScore/mappings";

export function mapPhoneRiskTxnResponse(providerBody: any) {
  const raw = providerBody ?? {};
  const data = raw?.data ?? null;

  const riskScore = typeof data?.risk?.score === "number" ? data.risk.score : null;
  const explained = explainRiskScore(riskScore);

  return {
    status: Boolean(raw?.status),
    referenceId: data?.referenceId ?? null,
    externalId: data?.externalId ?? null,
    statusInfo: {
      code: data?.status?.code ?? null,
      description: data?.status?.description ?? null,
      updatedOn: data?.status?.updatedOn ?? null,
    },
    phoneType: data?.phoneType?.description ?? null,
    carrier: data?.carrier?.name ?? null,
    location: {
      country: data?.location?.country?.name ?? null,
      iso2: data?.location?.country?.iso2 ?? null,
      city: data?.location?.city ?? null,
      timeZone: data?.location?.timeZone?.name ?? null,
      utcOffsetMin: data?.location?.timeZone?.utcOffsetMin ?? null,
      utcOffsetMax: data?.location?.timeZone?.utcOffsetMax ?? null,
    },
    blocklisting: {
      blocked: Boolean(data?.blocklisting?.blocked),
      description: data?.blocklisting?.blockDescription ?? null,
      code: data?.blocklisting?.blockCode ?? null,
    },
    risk: {
      score: riskScore,
      level: data?.risk?.level ?? null,
      recommendation: data?.risk?.recommendation ?? null,
      interpretation: explained
        ? {
            band: explained.band,
            recommendation: explained.recommendation,
            explanation: explained.explanation,
          }
        : null,
    },
    riskInsights: {
      status: data?.riskInsights?.status ?? null,
      category: mapReasonCodes(data?.riskInsights?.category),
      a2p: mapReasonCodes(data?.riskInsights?.a2P),
      p2p: mapReasonCodes(data?.riskInsights?.p2P),
      numberType: mapReasonCodes(data?.riskInsights?.numberType),
      ip: mapReasonCodes(data?.riskInsights?.ip),
      email: mapReasonCodes(data?.riskInsights?.email),
    },
  };
}