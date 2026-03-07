// src/app/api/admin/services/route.ts
// src/app/api/admin/services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeFeatures(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features
    .map((x) => String(x).trim())
    .filter(Boolean);
}

function serializeService(service: any) {
  return {
    id: service.id,
    key: service.key,
    name: service.name,
    description: service.description,
    priceCredits: service.priceCredits,
    features: normalizeFeatures(service.features),
    active: service.active,
    createdAt: service.createdAt instanceof Date
      ? service.createdAt.toISOString()
      : String(service.createdAt),
    updatedAt: service.updatedAt instanceof Date
      ? service.updatedAt.toISOString()
      : String(service.updatedAt),
    countryPrices: (service.countryPrices ?? []).map((p: any) => ({
      id: p.id,
      countryCode: p.countryCode,
      priceEur: Number(p.priceEur),
      active: p.active,
    })),
    operationPrices: (service.operationPrices ?? []).map((p: any) => ({
      id: p.id,
      operationKey: p.operationKey,
      priceCredits: p.priceCredits,
      active: p.active,
    })),
    _count: {
      creditTransactions: service._count?.creditTransactions ?? 0,
      countryPrices: service._count?.countryPrices ?? 0,
      operationPrices: service._count?.operationPrices ?? 0,
    },
  };
}

export async function GET() {
  const services = await prisma.service.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      countryPrices: {
        orderBy: [{ active: "desc" }, { countryCode: "asc" }],
      },
      operationPrices: {
        orderBy: [{ active: "desc" }, { operationKey: "asc" }],
      },
      _count: {
        select: {
          creditTransactions: true,
          countryPrices: true,
          operationPrices: true,
        },
      },
    },
  });

  return NextResponse.json({
    results: services.map(serializeService),
  });
}

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);

  const key = String(raw?.key ?? "")
    .trim()
    .toLowerCase();
  const name = String(raw?.name ?? "").trim();
  const description =
    raw?.description == null ? null : String(raw.description).trim() || null;
  const priceCredits = Number(raw?.priceCredits);
  const features = normalizeFeatures(raw?.features);

  if (!key) {
    return NextResponse.json(
      { error: "Service key is required" },
      { status: 400 }
    );
  }

  if (!name) {
    return NextResponse.json(
      { error: "Display name is required" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(priceCredits) || priceCredits < 0) {
    return NextResponse.json(
      { error: "Default credits must be a non-negative integer" },
      { status: 400 }
    );
  }

  const existing = await prisma.service.findUnique({
    where: { key },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: `Service with key "${key}" already exists` },
      { status: 409 }
    );
  }

  const created = await prisma.service.create({
    data: {
      key,
      name,
      description,
      priceCredits,
      features,
      active: true,
    },
    include: {
      countryPrices: {
        orderBy: [{ active: "desc" }, { countryCode: "asc" }],
      },
      operationPrices: {
        orderBy: [{ active: "desc" }, { operationKey: "asc" }],
      },
      _count: {
        select: {
          creditTransactions: true,
          countryPrices: true,
          operationPrices: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    service: serializeService(created),
  });
}