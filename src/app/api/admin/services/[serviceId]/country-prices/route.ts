// src/app/api/admin/services/[serviceId]/country-prices/route.ts
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma, Prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId } = await params;
  const numericServiceId = Number(serviceId);

  if (!Number.isInteger(numericServiceId) || numericServiceId <= 0) {
    return NextResponse.json({ error: "Invalid service id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    countryCode?: string;
    priceEur?: number;
    active?: boolean;
  };

  const countryCode = String(body.countryCode || "").trim().toUpperCase();
  const priceEur = Number(body.priceEur);
  const active = body.active !== false;

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return NextResponse.json(
      { error: "Country code must be a valid ISO-2 code." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(priceEur) || priceEur < 0) {
    return NextResponse.json(
      { error: "Country price must be a non-negative number." },
      { status: 400 }
    );
  }

  const service = await prisma.service.findUnique({
    where: { id: numericServiceId },
    select: { id: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  const row = await prisma.serviceCountryPrice.upsert({
    where: {
      service_country_unique: {
        serviceId: numericServiceId,
        countryCode,
      },
    },
    update: {
      priceEur: new Prisma.Decimal(priceEur),
      active,
      updatedAt: new Date(),
    },
    create: {
      serviceId: numericServiceId,
      countryCode,
      priceEur: new Prisma.Decimal(priceEur),
      active,
    },
    select: {
      id: true,
      countryCode: true,
      priceEur: true,
      active: true,
    },
  });

  return NextResponse.json({
    ok: true,
    row: {
      ...row,
      priceEur: Number(row.priceEur),
    },
  });
}