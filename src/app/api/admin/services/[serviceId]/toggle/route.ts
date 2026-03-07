// src/app/api/admin/services/[serviceId]/toggle/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
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

  const service = await prisma.service.findUnique({
    where: { id: numericServiceId },
    select: { id: true, active: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  const updated = await prisma.service.update({
    where: { id: numericServiceId },
    data: {
      active: !service.active,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, active: updated.active });
}