// src/app/api/admin/services/[serviceId]/country-prices/[priceId]/route.ts
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma, Prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ serviceId: string; priceId: string }>;
  }
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId, priceId } = await params;
  const numericServiceId = Number(serviceId);
  const numericPriceId = Number(priceId);

  if (
    !Number.isInteger(numericServiceId) ||
    numericServiceId <= 0 ||
    !Number.isInteger(numericPriceId) ||
    numericPriceId <= 0
  ) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    priceEur?: number;
    active?: boolean;
  };

  const priceEur = Number(body.priceEur);
  const active = body.active !== false;

  if (!Number.isFinite(priceEur) || priceEur < 0) {
    return NextResponse.json(
      { error: "Country price must be a non-negative number." },
      { status: 400 }
    );
  }

  const existing = await prisma.serviceCountryPrice.findFirst({
    where: {
      id: numericPriceId,
      serviceId: numericServiceId,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Country price not found." }, { status: 404 });
  }

  const row = await prisma.serviceCountryPrice.update({
    where: { id: numericPriceId },
    data: {
      priceEur: new Prisma.Decimal(priceEur),
      active,
      updatedAt: new Date(),
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

export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ serviceId: string; priceId: string }>;
  }
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId, priceId } = await params;
  const numericServiceId = Number(serviceId);
  const numericPriceId = Number(priceId);

  if (
    !Number.isInteger(numericServiceId) ||
    numericServiceId <= 0 ||
    !Number.isInteger(numericPriceId) ||
    numericPriceId <= 0
  ) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const existing = await prisma.serviceCountryPrice.findFirst({
    where: {
      id: numericPriceId,
      serviceId: numericServiceId,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Country price not found." }, { status: 404 });
  }

  await prisma.serviceCountryPrice.delete({
    where: { id: numericPriceId },
  });

  return NextResponse.json({ ok: true });
}