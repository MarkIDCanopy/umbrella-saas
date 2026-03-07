// src/app/api/transactions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getCreditCostsByTxnIds } from "@/lib/transactions/credits.server";

export async function GET(req: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, activeOrgId } = session;
  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const query = searchParams.get("query");
  const statuses = searchParams.getAll("status");
  const services = searchParams.getAll("service");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const batchId = searchParams.get("batchId");

  const where: any = {
    userId,
    // ✅ IMPORTANT:
    // - org workspace => organizationId = that org id
    // - personal workspace => organizationId = null (ONLY personal txns)
    organizationId: activeOrgId ? Number(activeOrgId) : null,
  };


  if (batchId) where.batchId = batchId;

  if (query) {
    // keep it simple; you can expand later to contains on other fields
    where.id = { contains: query };
  }

  if (statuses.length > 0) where.status = { in: statuses };
  if (services.length > 0) where.service = { in: services };

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [results, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  // attach creditCost
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
