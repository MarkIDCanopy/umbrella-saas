// src/app/api/admin/services/[serviceId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

function normalizeFeatures(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((x) => String(x).trim())
    .filter(Boolean);
}

function normalizeKey(input: unknown) {
  return String(input || "")
    .trim()
    .toLowerCase();
}

export async function GET() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      priceCredits: true,
      features: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      countryPrices: {
        orderBy: [{ active: "desc" }, { countryCode: "asc" }],
        select: {
          id: true,
          countryCode: true,
          priceEur: true,
          active: true,
        },
      },
      _count: {
        select: {
          creditTransactions: true,
          countryPrices: true,
        },
      },
    },
  });

  return NextResponse.json({
    results: services.map((s) => ({
      ...s,
      features: Array.isArray(s.features) ? s.features : [],
      countryPrices: s.countryPrices.map((p) => ({
        ...p,
        priceEur: Number(p.priceEur),
      })),
    })),
  });
}

export async function POST(req: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    key?: string;
    name?: string;
    description?: string | null;
    priceCredits?: number;
    features?: unknown;
  };

  const key = normalizeKey(body.key);
  const name = String(body.name || "").trim();
  const description = body.description?.trim() || null;
  const priceCredits = Number(body.priceCredits);
  const features = normalizeFeatures(body.features);

  if (!key || !/^[a-z0-9-]+$/.test(key)) {
    return NextResponse.json(
      { error: "Service key must contain only lowercase letters, numbers and hyphens." },
      { status: 400 }
    );
  }

  if (!name) {
    return NextResponse.json({ error: "Service name is required." }, { status: 400 });
  }

  if (!Number.isInteger(priceCredits) || priceCredits < 0) {
    return NextResponse.json(
      { error: "Default price credits must be a non-negative integer." },
      { status: 400 }
    );
  }

  const exists = await prisma.service.findUnique({
    where: { key },
    select: { id: true },
  });

  if (exists) {
    return NextResponse.json(
      { error: "A service with this key already exists." },
      { status: 400 }
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
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      priceCredits: true,
      features: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      countryPrices: {
        orderBy: [{ active: "desc" }, { countryCode: "asc" }],
        select: {
          id: true,
          countryCode: true,
          priceEur: true,
          active: true,
        },
      },
      _count: {
        select: {
          creditTransactions: true,
          countryPrices: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    service: {
      ...created,
      features: Array.isArray(created.features) ? created.features : [],
      countryPrices: created.countryPrices.map((p) => ({
        ...p,
        priceEur: Number(p.priceEur),
      })),
    },
  });
}