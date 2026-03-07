// src/app/api/organizations/current/role/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBillingContext } from "@/lib/billing/context";

export async function GET() {
  const ctx = await getBillingContext();
  if (!ctx) return NextResponse.json({ role: null }, { status: 401 });

  if (ctx.kind !== "org") {
    return NextResponse.json({ role: "personal" }, { headers: { "Cache-Control": "no-store" } });
  }

  const m = await prisma.organizationMember.findFirst({
    where: {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      status: "active",
    },
    select: { role: true, status: true },
  });

  return NextResponse.json(
    { role: m?.role ?? null, status: m?.status ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}