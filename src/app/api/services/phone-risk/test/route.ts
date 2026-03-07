// src/app/api/services/phone-risk/test/route.ts
import { NextResponse } from "next/server";
import { explainRiskScore } from "@/lib/services/phoneRiskScore/mappings";

export async function POST() {
  await new Promise((r) => setTimeout(r, 250));

  const score = 301;
  const interpretation = explainRiskScore(score);

  return NextResponse.json({
    status: true,
    referenceId: "TEST-RISK-REF-123",
    statusInfo: {
      code: 300,
      description: "Transaction successfully completed",
      updatedOn: new Date().toISOString(),
    },
    phoneType: "MOBILE",
    carrier: "Test Carrier",
    location: { country: "Austria", iso2: "AT", city: "Vienna" },
    blocklisting: { blocked: false, description: "Not blocked" },
    risk: {
      score,
      level: "medium-low",
      recommendation: "allow",
      interpretation: interpretation
        ? {
            band: interpretation.band,
            recommendation: interpretation.recommendation,
            explanation: interpretation.explanation,
          }
        : null,
    },
    riskInsights: {
      category: ["Low activity: not enough signals to classify as risky or trustworthy."],
      a2p: ["Low long-term activity: low verification traffic over the past 90 days."],
      p2p: ["No P2P data analyzed. Cannot classify P2P behavior."],
      numberType: [],
      ip: [],
      email: [],
    },
  });
}