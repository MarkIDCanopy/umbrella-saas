// src/app/api/services/phone-status/test/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  await new Promise((r) => setTimeout(r, 300));

  return NextResponse.json({
    referenceId: "TEST-123",
    status: {
      code: 300,
      description: "Transaction successfully completed",
      updatedOn: new Date().toISOString(),
    },
    phoneType: "MOBILE",
    carrier: "Test Carrier",
    subscriberStatus: "ACTIVE",
    deviceStatus: "REACHABLE",
    roaming: "UNAVAILABLE",
    location: {
      country: "Germany",
      city: "Berlin",
    },
  });
}
