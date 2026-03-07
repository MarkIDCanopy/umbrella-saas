// src/app/api/admin/transactions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getCreditCostsByTxnIds } from "@/lib/transactions/credits.server";

export async function GET(req: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 25)));

  const query = searchParams.get("query")?.trim();
  const actor = searchParams.get("actor")?.trim();
  const statuses = searchParams.getAll("status");
  const services = searchParams.getAll("service");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const and: any[] = [];

  if (query) {
    and.push({
      OR: [
        { id: { contains: query, mode: "insensitive" } },
        { batchId: { contains: query, mode: "insensitive" } },
        { service: { contains: query, mode: "insensitive" } },
        { organization: { name: { contains: query, mode: "insensitive" } } },
      ],
    });
  }

  if (actor) {
    and.push({
      user: {
        OR: [
          { email: { contains: actor, mode: "insensitive" } },
          { fullName: { contains: actor, mode: "insensitive" } },
        ],
      },
    });
  }

  if (statuses.length > 0) {
    and.push({
      status: { in: statuses as Array<"OK" | "REVIEW" | "NOK" | "ERROR"> },
    });
  }

  if (services.length > 0) {
    and.push({
      service: { in: services },
    });
  }

  if (from || to) {
    const createdAt: any = {};
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to);
    and.push({ createdAt });
  }

  const where = and.length ? { AND: and } : {};

  const [results, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  const ids = results.map((t) => t.id);
  const costs = await getCreditCostsByTxnIds(ids);

  const resultsWithCost = results.map((t) => ({
    ...t,
    creditCost: costs[t.id] ?? null,
  }));

  return NextResponse.json({
    results: resultsWithCost,
    total,
    page,
    pageSize,
  });
}