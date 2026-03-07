// src/app/api/services/phone-id/test/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  await new Promise((r) => setTimeout(r, 300));

  return NextResponse.json({
    status: true,
    data: {
      referenceId: "TEST-PHONEID-123",
      externalId: null,
      status: {
        code: 300,
        description: "Transaction successfully completed",
        updatedOn: new Date().toISOString(),
      },
      phoneType: {
        code: "2",
        description: "MOBILE",
      },
      carrier: {
        name: "Test Carrier",
      },
      blocklisting: {
        blocked: false,
        blockCode: 0,
        blockDescription: "Not blocked",
      },
      location: {
        city: "Vienna",
        state: null,
        zip: "1010",
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
          name: "Europe/Vienna",
          utcOffsetMin: "+1",
          utcOffsetMax: "+2",
        },
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
    },
  });
}