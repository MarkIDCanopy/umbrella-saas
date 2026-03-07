// src/app/api/services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // TS is being weird about `.service`, so to be safe we cast prisma to any here:
  const services = await (prisma as any).service.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  type DbService = (typeof services)[number];

  return NextResponse.json(
    services.map((s: DbService) => ({
      id: s.key,
      name: s.name,
      credits: s.priceCredits,
      description: s.description ?? "",
      features: (s.features as string[] | null) ?? [],
    }))
  );
}
