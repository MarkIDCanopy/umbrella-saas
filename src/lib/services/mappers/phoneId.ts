// src/lib/services/mappers/phoneId.ts

function pickAddon(data: any, key: string) {
  return data?.addons?.[key] ?? data?.[key] ?? null;
}

export function mapPhoneIdTxnResponse(providerBody: any) {
  const raw = providerBody ?? {};
  const data = raw?.data ?? null;

  return {
    status: Boolean(raw?.status),
    referenceId: data?.referenceId ?? null,
    externalId: data?.externalId ?? null,

    statusInfo: {
      code: data?.status?.code ?? null,
      description: data?.status?.description ?? null,
      updatedOn: data?.status?.updatedOn ?? null,
    },

    phoneType: {
      code: data?.phoneType?.code ?? null,
      description: data?.phoneType?.description ?? null,
    },

    carrier: data?.carrier?.name ?? null,

    blocklisting: {
      blocked: Boolean(data?.blocklisting?.blocked),
      code: data?.blocklisting?.blockCode ?? null,
      description: data?.blocklisting?.blockDescription ?? null,
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
          countryCode:
            data?.numbering?.cleansing?.call?.countryCode ?? null,
          phoneNumber:
            data?.numbering?.cleansing?.call?.phoneNumber ?? null,
          cleansedCode:
            data?.numbering?.cleansing?.call?.cleansedCode ?? null,
          minLength: data?.numbering?.cleansing?.call?.minLength ?? null,
          maxLength: data?.numbering?.cleansing?.call?.maxLength ?? null,
        },
        sms: {
          countryCode:
            data?.numbering?.cleansing?.sms?.countryCode ?? null,
          phoneNumber:
            data?.numbering?.cleansing?.sms?.phoneNumber ?? null,
          cleansedCode:
            data?.numbering?.cleansing?.sms?.cleansedCode ?? null,
          minLength: data?.numbering?.cleansing?.sms?.minLength ?? null,
          maxLength: data?.numbering?.cleansing?.sms?.maxLength ?? null,
        },
      },
    },

    location: {
      city: data?.location?.city ?? null,
      state: data?.location?.state ?? null,
      zip: data?.location?.zip ?? null,
      county: data?.location?.county ?? null,
      metroCode: data?.location?.metroCode ?? null,
      country: data?.location?.country?.name ?? null,
      iso2: data?.location?.country?.iso2 ?? null,
      iso3: data?.location?.country?.iso3 ?? null,
      latitude: data?.location?.coordinates?.latitude ?? null,
      longitude: data?.location?.coordinates?.longitude ?? null,
      timeZone: data?.location?.timeZone?.name ?? null,
      utcOffsetMin: data?.location?.timeZone?.utcOffsetMin ?? null,
      utcOffsetMax: data?.location?.timeZone?.utcOffsetMax ?? null,
    },

    addons: {
      ageVerify: pickAddon(data, "ageVerify"),
      breachedData: pickAddon(data, "breachedData"),
      callForwardDetection: pickAddon(data, "callForwardDetection"),
      contact: pickAddon(data, "contact"),
      contactMatch: pickAddon(data, "contactMatch"),
      numberDeactivation: pickAddon(data, "numberDeactivation"),
      subscriberStatus: pickAddon(data, "subscriberStatus"),
      portingHistory: pickAddon(data, "portingHistory"),
      portingStatus: pickAddon(data, "portingStatus"),
      simSwap: pickAddon(data, "simSwap"),
    },
  };
}