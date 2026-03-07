// src/app/api/admin/services/[serviceId]/operation-prices/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseServiceId(serviceIdRaw: string) {
  const serviceId = Number(serviceIdRaw);
  return Number.isInteger(serviceId) && serviceId > 0 ? serviceId : null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId: serviceIdParam } = await params;
  const serviceId = parseServiceId(serviceIdParam);

  if (!serviceId) {
    return NextResponse.json({ error: "Invalid service id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);

  const operationKey = String(raw?.operationKey ?? "").trim();
  const priceCredits = Number(raw?.priceCredits);
  const active = raw?.active == null ? true : Boolean(raw.active);

  if (!operationKey) {
    return NextResponse.json(
      { error: "operationKey is required" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(priceCredits) || priceCredits < 0) {
    return NextResponse.json(
      { error: "priceCredits must be a non-negative integer" },
      { status: 400 }
    );
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const row = await prisma.serviceOperationPrice.upsert({
    where: {
      service_operation_unique: {
        serviceId,
        operationKey,
      },
    },
    update: {
      priceCredits,
      active,
    },
    create: {
      serviceId,
      operationKey,
      priceCredits,
      active,
    },
  });

  return NextResponse.json({
    ok: true,
    row: {
      id: row.id,
      operationKey: row.operationKey,
      priceCredits: row.priceCredits,
      active: row.active,
    },
  });
}