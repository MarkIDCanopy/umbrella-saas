// src/lib/services/mappers/fullPhoneIntelligence.ts
export function mapFullPhoneIntelligenceTxnResponse(providerBody: any) {
  const raw = providerBody ?? {};
  const data = raw?.data ?? null;

  return {
    status: Boolean(raw?.status),

    referenceId: data?.referenceId ?? null,
    externalId: data?.externalId ?? null,

    statusInfo: {
      updatedOn: data?.status?.updatedOn ?? null,
      code: data?.status?.code ?? null,
      description: data?.status?.description ?? null,
    },

    numbering: {
      original: {
        completePhoneNumber:
          data?.numbering?.original?.completePhoneNumber ?? null,
        countryCode: data?.numbering?.original?.countryCode ?? null,
        phoneNumber: data?.numbering?.original?.phoneNumber ?? null,
      },
      cleansing: {
        call: {
          countryCode: data?.numbering?.cleansing?.call?.countryCode ?? null,
          phoneNumber: data?.numbering?.cleansing?.call?.phoneNumber ?? null,
          cleansedCode: data?.numbering?.cleansing?.call?.cleansedCode ?? null,
          minLength: data?.numbering?.cleansing?.call?.minLength ?? null,
          maxLength: data?.numbering?.cleansing?.call?.maxLength ?? null,
        },
        sms: {
          countryCode: data?.numbering?.cleansing?.sms?.countryCode ?? null,
          phoneNumber: data?.numbering?.cleansing?.sms?.phoneNumber ?? null,
          cleansedCode: data?.numbering?.cleansing?.sms?.cleansedCode ?? null,
          minLength: data?.numbering?.cleansing?.sms?.minLength ?? null,
          maxLength: data?.numbering?.cleansing?.sms?.maxLength ?? null,
        },
      },
    },

    riskInsights: {
      status: data?.riskInsights?.status ?? null,
      category: Array.isArray(data?.riskInsights?.category)
        ? data.riskInsights.category
        : [],
      a2P: Array.isArray(data?.riskInsights?.a2P)
        ? data.riskInsights.a2P
        : [],
      p2P: Array.isArray(data?.riskInsights?.p2P)
        ? data.riskInsights.p2P
        : [],
      numberType: Array.isArray(data?.riskInsights?.numberType)
        ? data.riskInsights.numberType
        : [],
      ip: Array.isArray(data?.riskInsights?.ip) ? data.riskInsights.ip : [],
      email: Array.isArray(data?.riskInsights?.email)
        ? data.riskInsights.email
        : [],
    },

    phoneType: {
      code: data?.phoneType?.code ?? null,
      description: data?.phoneType?.description ?? null,
    },

    location: {
      city: data?.location?.city ?? null,
      state: data?.location?.state ?? null,
      zip: data?.location?.zip ?? null,
      metroCode: data?.location?.metroCode ?? null,
      county: data?.location?.county ?? null,
      country: {
        name: data?.location?.country?.name ?? null,
        iso2: data?.location?.country?.iso2 ?? null,
        iso3: data?.location?.country?.iso3 ?? null,
      },
      coordinates: {
        latitude: data?.location?.coordinates?.latitude ?? null,
        longitude: data?.location?.coordinates?.longitude ?? null,
      },
      timeZone: {
        name: data?.location?.timeZone?.name ?? null,
        utcOffsetMin: data?.location?.timeZone?.utcOffsetMin ?? null,
        utcOffsetMax: data?.location?.timeZone?.utcOffsetMax ?? null,
      },
    },

    carrier: {
      name: data?.carrier?.name ?? null,
    },

    blocklisting: {
      blocked: Boolean(data?.blocklisting?.blocked),
      blockCode: data?.blocklisting?.blockCode ?? null,
      blockDescription: data?.blocklisting?.blockDescription ?? null,
    },

    risk: {
      level: data?.risk?.level ?? null,
      recommendation: data?.risk?.recommendation ?? null,
      score: data?.risk?.score ?? null,
    },
  };
}