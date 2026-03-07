// src/lib/services/mappers/addressVerification.ts
function safeString(v: any) {
  return typeof v === "string" ? v : "";
}

export function mapAddressVerificationTxnResponse(providerBody: any) {
  const r = providerBody ?? {};

  // if it's already in the UI shape from your test route/provider mapper, just ensure timestamp
  if (typeof r?.globalResult === "object") {
    return {
      ...r,
      timestamp:
        safeString(r.timestamp) ||
        new Date().toISOString().replace("T", " ").split(".")[0],
      // guard common string fields so OutputPanel doesn't blow up
      inputAddress: safeString(r.inputAddress) || r.inputAddress,
      correctedAddress: safeString(r.correctedAddress) || r.correctedAddress,
      finalAddress: safeString(r.finalAddress) || r.finalAddress,
      addressStatus: safeString(r.addressStatus) || r.addressStatus,
      matchQuality: safeString(r.matchQuality) || r.matchQuality,
      extendedMessage: safeString(r.extendedMessage) || r.extendedMessage,
    };
  }

  // Unknown shape (e.g., provider raw error). Return a minimal object so UI remains stable.
  return {
    inputAddress: "",
    correctedAddress: "",
    finalAddress: "",
    addressStatus: "",
    matchQuality: "",
    score: 0,
    globalResult: { overall: "ERROR", totalScore: 0 },
    identity: { fullName: "", dob: "" },
    extendedMessage: "",
    timestamp: new Date().toISOString().replace("T", " ").split(".")[0],
  };
}