// src/lib/services/mappers/phoneStatus.ts
export function mapPhoneStatusTxnResponse(raw: any) {
  const r = raw ?? {};

  return {
    referenceId: r?.reference_id ?? r?.data?.reference_id ?? null,
    status: r?.status ?? null,
    phoneType: r?.phone_type?.description ?? null,
    carrier: r?.carrier?.name ?? null,
    subscriberStatus: r?.live?.subscriber_status ?? null,
    deviceStatus: r?.live?.device_status ?? null,
    roaming: r?.live?.roaming ?? null,
    location: {
      country: r?.location?.country?.name ?? null,
      city: r?.location?.city ?? null,
    },
  };
}