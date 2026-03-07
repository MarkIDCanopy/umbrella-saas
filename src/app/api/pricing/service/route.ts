import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eurToCredits } from "@/lib/billing/pricing";

function normalizeCountry(country?: string | null) {
  return String(country ?? "").trim().toUpperCase();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const serviceKey = String(url.searchParams.get("key") ?? "").trim();
  const countryCode = normalizeCountry(url.searchParams.get("country"));

  if (!serviceKey) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({
    where: { key: serviceKey },
    select: { id: true, priceCredits: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  // default fallback (base price)
  let credits = service.priceCredits ?? 0;
  let source: "base" | "country" = "base";

  if (countryCode) {
    const row = await prisma.serviceCountryPrice.findFirst({
      where: {
        serviceId: service.id,
        countryCode,
        active: true,
      },
      select: { priceEur: true },
    });

    if (row?.priceEur != null) {
      const eur = Number(row.priceEur);
      const c = eurToCredits(eur);
      if (c > 0) {
        credits = c;
        source = "country";
      }
    }
  }

  return NextResponse.json({ credits, source });
}
