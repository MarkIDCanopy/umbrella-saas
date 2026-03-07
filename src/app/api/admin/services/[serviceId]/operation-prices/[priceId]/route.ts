// src/app/api/admin/services/[serviceId]/operation-prices/[priceId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseIds(serviceIdRaw: string, priceIdRaw: string) {
  const serviceId = Number(serviceIdRaw);
  const priceId = Number(priceIdRaw);

  return {
    serviceId:
      Number.isInteger(serviceId) && serviceId > 0 ? serviceId : null,
    priceId: Number.isInteger(priceId) && priceId > 0 ? priceId : null,
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ serviceId: string; priceId: string }> }
) {
  const { serviceId: serviceIdParam, priceId: priceIdParam } = await params;
  const { serviceId, priceId } = parseIds(serviceIdParam, priceIdParam);

  if (!serviceId || !priceId) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);

  const priceCredits = Number(raw?.priceCredits);
  const active = raw?.active == null ? true : Boolean(raw.active);

  if (!Number.isInteger(priceCredits) || priceCredits < 0) {
    return NextResponse.json(
      { error: "priceCredits must be a non-negative integer" },
      { status: 400 }
    );
  }

  const existing = await prisma.serviceOperationPrice.findFirst({
    where: {
      id: priceId,
      serviceId,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Operation price not found" },
      { status: 404 }
    );
  }

  const row = await prisma.serviceOperationPrice.update({
    where: { id: priceId },
    data: {
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ serviceId: string; priceId: string }> }
) {
  const { serviceId: serviceIdParam, priceId: priceIdParam } = await params;
  const { serviceId, priceId } = parseIds(serviceIdParam, priceIdParam);

  if (!serviceId || !priceId) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const existing = await prisma.serviceOperationPrice.findFirst({
    where: {
      id: priceId,
      serviceId,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Operation price not found" },
      { status: 404 }
    );
  }

  await prisma.serviceOperationPrice.delete({
    where: { id: priceId },
  });

  return NextResponse.json({ ok: true });
}