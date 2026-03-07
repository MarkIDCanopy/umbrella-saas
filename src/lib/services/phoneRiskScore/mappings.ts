// src/lib/phoneRiskScore/mappings.ts

export type RiskExplanation = {
  band: string; // e.g. "0–80"
  level: string; // e.g. "low"
  recommendation: "allow" | "flag" | "block";
  explanation: string;
};

export function explainRiskScore(score: number | null | undefined): RiskExplanation | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;

  // Based on your table
  if (score >= 0 && score <= 80) {
    return {
      band: "0–80",
      level: "low",
      recommendation: "allow",
      explanation:
        "Insufficient risk indicators. Not enough data to classify as risky or trustworthy, but no strong suspicious signals either.",
    };
  }
  if (score >= 81 && score <= 450) {
    return {
      band: "81–450",
      level: "very-low",
      recommendation: "allow",
      explanation:
        "Significant confidence-building behavior observed on-network. Likely genuine activity patterns.",
    };
  }
  if (score >= 451 && score <= 500) {
    return {
      band: "451–500",
      level: "medium-low",
      recommendation: "flag",
      explanation: "Suspicious transaction signals present. Consider additional verification steps.",
    };
  }
  if (score >= 501 && score <= 600) {
    return {
      band: "501–600",
      level: "medium",
      recommendation: "flag",
      explanation: "Multiple suspicious signals. Consider verification, step-up auth, or review.",
    };
  }
  if (score >= 601 && score <= 800) {
    return {
      band: "601–800",
      level: "high",
      recommendation: "block",
      explanation: "Risky transaction. Strong indicators of fraud or abnormal behavior.",
    };
  }
  if (score >= 801 && score <= 1000) {
    return {
      band: "801–1000",
      level: "very-high",
      recommendation: "block",
      explanation: "Very risky transaction. Strong fraud indicators or abusive patterns.",
    };
  }

  return {
    band: "out of range",
    level: "unknown",
    recommendation: "flag",
    explanation: "Score outside expected range. Treat as suspicious until confirmed.",
  };
}

const REASON_CODES: Record<number, string> = {
  // Overall
  10010: "Low activity: not enough signals to classify as risky or trustworthy.",
  10020: "Low regular activity: trustworthy category based on past behavior.",
  10021: "Regular activity: most trustworthy category based on past behavior.",
  10030: "Low-risk irregular activity: risky category based on past behavior.",
  10031: "Medium-risk irregular activity: high-risk category based on past behavior.",
  10032: "High-risk irregular activity: highest-risk category based on past behavior.",
  10040: "Irregular number type: risky static attributes (e.g. VOIP or blocklist).",

  // A2P Activity
  20001: "No long-term activity: much less than expected activity over the past 90 days.",
  20002: "High long-term activity: more than expected activity over the past 90 days.",
  20003: "High short-term activity: more than expected activity over the last 24 hours.",
  20004: "Moderate long-term activity: expected activity over the past 90 days.",
  20005: "Moderate short-term activity: expected activity over the last 24 hours.",
  20006: "Sparse long-term activity: sparse regular verification traffic over the past 90 days.",
  20007: "Continuous long-term activity: continuous regular traffic over the past 90 days.",
  20008: "Very high long-term activity: very high volume over the past 90 days.",
  20009: "Very high short-term activity: very high volume over the last 24 hours.",
  20010: "No activity: very low volume or none ever observed.",
  20011: "Low long-term activity: low verification traffic over the past 90 days.",
  20012: "Low short-term activity: low traffic over the past 24 hours.",
  20013: "Low activity: less than expected activity for this number.",

  // A2P Range
  20101: "No range activity: little/no activity for risky range (or not in risky range).",
  20102: "Low range activity: some risky range activity over the past 90 days.",
  20103: "Moderate short-term range activity: significant risky range activity in last 24 hours.",
  20104: "Moderate long-term range activity: significant risky range activity over past 90 days.",
  20105: "High short-term range activity: very significant activity in last 24 hours.",
  20106: "High long-term range activity: very significant activity over past 90 days.",
  20107: "Very high long-term range activity: extremely high activity over past 90 days.",
  20108: "Very high short-term range activity: extremely high activity in last 24 hours.",

  // A2P Risky Services
  21001: "Moderate activity on risky services over past 90 days.",
  21002: "High activity on risky services over past 90 days.",
  21003: "Machine-like activity: behavior suggests automation/bot operation.",
  21004: "Long-term activity on risky services over past 90 days.",
  21005: "Short-term activity on risky services over past 24 hours.",
  21006: "High long-term activity on risky services over past 90 days.",
  21007: "High short-term activity on risky services over past 24 hours.",
  21008: "Long-term range activity on risky services over past 90 days.",
  21009: "Short-term range activity on risky services over past 24 hours.",
  21010: "High long-term range activity on risky services over past 90 days.",
  21011: "High short-term range activity on risky services over past 24 hours.",
  21012: "Very high short-term activity on risky services over past 90 days.",
  21013: "Very high long-term activity on risky services over past 24 hours.",
  21014: "Very high short-term range activity on risky services over past 90 days.",
  21015: "Very high long-term range activity on risky services over past 24 hours.",
  21016: "Machine-like range activity: extremely high verification volume in <1 hour across the range.",

    // A2P Seen-in-history signals
  22001: "Seen in the last 1 day: this number was seen in verification traffic in the last 1 day.",
  22007: "Seen in the last 7 days: this number was seen in verification traffic in the last 7 days.",
  22015: "Seen in the last 15 days: this number was seen in verification traffic in the last 15 days.",
  22101: "Seen in the last 1 month: this number was seen in verification traffic in the last 1 month.",
  22102: "Seen in the last 2 months: this number was seen in verification traffic in the last 2 months.",
  22103: "Seen in the last 3 months: this number was seen in verification traffic in the last 3 months.",
  22203: "Seen more than 3 months ago: this number was not seen in verification traffic in the last 3 months.",
  // P2P
  30201: "No P2P data analyzed. Cannot classify P2P behavior.",

  // Number Type
  40001: "Premium number: risky static attribute.",
  40002: "VOIP number: disposable/untraceable internet-based number.",
  40003: "Toll-free number: easily obtained, often forwards to untraceable destinations.",
  40004: "Invalid number: number is not valid.",
  40005: "Payphone number: untraceable public payphone.",
  40006: "Voicemail number: rings directly to voicemail.",
  40007: "Pager number: unreachable pager.",
  40008: "High-risk phone type: risky classification.",
  40009: "High-risk carrier: associated with very risky carrier.",
  40010: "Medium-risk carrier: associated with risky carrier.",
  40011: "High-risk prefix: prefix associated with risky behavior.",
  40012: "Phone too long: invalid number even after cleansing.",
  40013: "Blacklisted number: flagged as a source of fraud.",
  40014: "High-risk country: associated with disproportionate fraud attacks.",
  40015: "Technical number: used for telecom technical purposes (e.g., roaming).",
  40016: "Number used by application: reserved number used inappropriately.",
  40017: "Whitelisted by customer: customer-marked as safe.",
  40018: "Phone too short: number too short to be valid.",

  // IP
  50001: "IP moderate short-term activity: expected level of activity for this IP address over the last 24 hours.",
  50002: "IP moderate long-term activity: expected level of activity for this IP address over the past 90 days.",
  50003: "IP moderate short-term activity on risky services: significant short-term activity with risky services.",
  50004: "IP moderate long-term activity on risky services: significant long-term activity with risky services.",
  50005: "IP high short-term activity: higher than expected short-term activity on this IP address.",
  50006: "IP high long-term activity: higher than expected long-term activity on this IP address.",
  50007: "IP high short-term activity on risky services: very significant risky short-term activity on this IP.",
  50008: "IP high long-term activity on risky services: very significant risky long-term activity on this IP.",
  50009: "IP very high short-term activity: very frequent IP attribute changes on this number in the last 24 hours.",
  50010: "IP very high long-term activity: very frequent IP attribute changes on this number in the last 90 days.",
  50011: "IP short-term activity on risky services: IP attribute changes tied to risky services over the past 24 hours.",
  50012: "IP long-term activity on risky services: IP attribute changes tied to risky services over the past 90 days.",
  50013: "IP very high short-term activity on risky services: very frequent risky service changes on this IP over 24 hours.",
  50014: "IP very high long-term activity on risky services: very frequent risky service changes on this IP over 90 days.",
  50015: "Anonymous proxy: IP address is linked to anonymous proxies.",
  50016: "VPN: IP address is associated with a VPN.",
  50017: "Hosting provider: IP belongs to a hosting provider — atypical behavior for real users.",
  50018: "TOR exit node: IP address is a known Tor exit node — often used to mask traffic origin.",

  // Email
  60001: "Email moderate short-term activity: expected level over last 24 hours.",
  60002: "Email moderate long-term activity: expected level over past 90 days.",
  60003: "Email moderate short-term activity on risky services: significant risky activity in last 24 hours.",
  60004: "Email moderate long-term activity on risky services: significant risky activity over past 90 days.",
  60005: "Email high short-term activity: more than expected short-term activity.",
  60006: "Email high long-term activity: more than expected long-term activity.",
  60007: "Email high short-term activity on risky services: very significant risky activity (24h).",
  60008: "Email high long-term activity on risky services: very significant risky activity (90d).",
  60009: "Email very high short-term activity: very high traffic in last 24 hours.",
  60010: "Email very high long-term activity: very high traffic in past 90 days.",
  60011: "Machine-generated email: behavior suggests automation/bot control.",
  60012: "Invalid email: likely not used by a genuine end user.",
  60013: "Disposable email domain: temporary/disposable provider.",
};

export function mapReasonCodes(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  return codes
    .map((c) => Number(c))
    .filter((n) => Number.isFinite(n))
    .map((n) => REASON_CODES[n] ?? `Unknown reason code: ${n}`);
}