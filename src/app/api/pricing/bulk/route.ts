// src/app/api/pricing/bulk/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eurToCredits } from "@/lib/billing/pricing";

function normCC(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

export async function POST(req: Request) {
  const raw: unknown = await req.json().catch(() => null);

  const serviceKey =
    raw && typeof raw === "object" && "serviceKey" in raw
      ? String((raw as any).serviceKey ?? "").trim()
      : "";

  const countriesRaw: unknown[] =
    raw && typeof raw === "object" && "countries" in raw && Array.isArray((raw as any).countries)
      ? ((raw as any).countries as unknown[])
      : [];

  if (!serviceKey) {
    return NextResponse.json({ error: "Missing serviceKey" }, { status: 400 });
  }

  // ✅ Ensure this is a real string[]
  const countries: string[] = Array.from(
    new Set(
      countriesRaw
        .filter((c): c is string => typeof c === "string" || typeof c === "number")
        .map((c) => normCC(c))
        .filter((c) => c.length === 2)
    )
  );

  const service = await prisma.service.findUnique({
    where: { key: serviceKey },
    select: { id: true, priceCredits: true },
  });

  if (!service) {
    return NextResponse.json(
      { error: `Service not found for key="${serviceKey}"` },
      { status: 404 }
    );
  }

  const rows =
    countries.length === 0
      ? []
      : await prisma.serviceCountryPrice.findMany({
          where: {
            serviceId: service.id,
            countryCode: { in: countries }, // ✅ now string[]
            active: true,
          },
          select: { countryCode: true, priceEur: true },
        });

  const prices: Record<string, number> = {};
  for (const r of rows) {
    const credits = eurToCredits(Number(r.priceEur));
    if (credits > 0) prices[String(r.countryCode).toUpperCase()] = credits;
  }

  return NextResponse.json({
    serviceKey,
    fallbackCredits: service.priceCredits ?? 0,
    prices,
  });
}
