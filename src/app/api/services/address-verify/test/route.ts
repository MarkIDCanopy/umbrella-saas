//  src/app/api/services/address-verify/test/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const payload = await req.json();

  await new Promise((r) => setTimeout(r, 400));

  const address = payload?.address ?? {};
  const identity = payload?.identity ?? {};

  const ok =
    payload?.country &&
    address?.street &&
    identity?.firstname;

  const inputAddress = [
    address.street ?? "",
    address.number ?? "",
    address.zip ?? "",
    address.city ?? "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const correctedAddress = [
    [address.street ?? "", address.number ?? ""].filter(Boolean).join(" "),
    [address.zip ?? "", address.city ?? ""].filter(Boolean).join(" "),
    payload?.country ?? "",
  ]
    .filter(Boolean)
    .join(", ")
    .trim();

  const finalAddress = [
    address.street ?? "",
    address.number ?? "",
    address.zip ?? "",
    address.city ?? "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return NextResponse.json({
    inputAddress,
    correctedAddress,
    finalAddress,
    addressStatus: "unchanged",
    matchQuality: ok ? "EXACT" : "NO_MATCH",
    score: ok ? 100 : 0,
    globalResult: {
      overall: ok ? "OK" : "NOK",
      totalScore: ok ? 100 : 0,
    },
    identity: {
      fullName: `${identity.firstname ?? ""} ${identity.lastname ?? ""}`.trim(),
      dob: identity.dob ?? "",
    },
    extendedMessage: ok ? "addressFound" : "noMatch",
    timestamp: new Date().toISOString().replace("T", " ").split(".")[0],
  });
}