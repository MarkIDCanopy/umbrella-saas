// src/app/api/services/full-phone-intelligence/test/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  await new Promise((r) => setTimeout(r, 300));

  return NextResponse.json({
    status: true,
    data: {
      referenceId: "TEST-FULLPHONEINTEL-123",
      externalId: null,
      status: {
        updatedOn: new Date().toISOString(),
        code: 300,
        description: "Transaction successfully completed",
      },
      numbering: {
        original: {
          completePhoneNumber: "+436501234567",
          countryCode: "43",
          phoneNumber: "6501234567",
        },
        cleansing: {
          call: {
            countryCode: "43",
            phoneNumber: "6501234567",
            cleansedCode: 100,
            minLength: 7,
            maxLength: 13,
          },
          sms: {
            countryCode: "43",
            phoneNumber: "6501234567",
            cleansedCode: 100,
            minLength: 7,
            maxLength: 13,
          },
        },
      },
      riskInsights: {
        status: 800,
        category: [10010],
        a2P: [22007, 20011, 20101],
        p2P: [30201],
        numberType: [],
        ip: [],
        email: [],
      },
      phoneType: {
        code: "2",
        description: "MOBILE",
      },
      location: {
        city: "Countrywide",
        state: null,
        zip: null,
        metroCode: null,
        county: null,
        country: {
          name: "Austria",
          iso2: "AT",
          iso3: "AUT",
        },
        coordinates: {
          latitude: null,
          longitude: null,
        },
        timeZone: {
          name: null,
          utcOffsetMin: "+1",
          utcOffsetMax: "+1",
        },
      },
      carrier: {
        name: "T-Mobile Austria GmbH",
      },
      blocklisting: {
        blocked: false,
        blockCode: 0,
        blockDescription: "Not blocked",
      },
      risk: {
        level: "medium-low",
        recommendation: "allow",
        score: 301,
      },
    },
  });
}