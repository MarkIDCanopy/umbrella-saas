// src/app/api/admin/dashboard/overview/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getCreditCostsByTxnIds } from "@/lib/transactions/credits.server";

export const runtime = "nodejs";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

// ✅ local-date key, not UTC ISO date
function dateKeyLocal(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const periodDays = 7;
  const today = startOfDay(new Date());
  const from = addDays(today, -(periodDays - 1));
  const toExclusive = addDays(today, 1);

  const [periodTxns, usageRows, recentTransactions, distinctUsers, distinctOrgs] =
    await Promise.all([
      prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: from,
            lt: toExclusive,
          },
        },
        select: {
          id: true,
          createdAt: true,
          status: true,
          service: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      prisma.creditTransaction.findMany({
        where: {
          type: "usage",
          createdAt: {
            gte: from,
            lt: toExclusive,
          },
        },
        select: {
          createdAt: true,
          delta: true,
        },
      }),

      prisma.transaction.findMany({
        take: 12,
        orderBy: { createdAt: "desc" },
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

      prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: from,
            lt: toExclusive,
          },
        },
        distinct: ["userId"],
        select: {
          userId: true,
        },
      }),

      prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: from,
            lt: toExclusive,
          },
          organizationId: {
            not: null,
          },
        },
        distinct: ["organizationId"],
        select: {
          organizationId: true,
        },
      }),
    ]);

  const dailyMap = new Map<
    string,
    {
      date: string;
      success: number;
      review: number;
      failed: number;
      credits: number;
    }
  >();

  for (let i = 0; i < periodDays; i++) {
    const day = addDays(from, i);
    const key = dateKeyLocal(day);

    dailyMap.set(key, {
      date: key,
      success: 0,
      review: 0,
      failed: 0,
      credits: 0,
    });
  }

  const serviceCounts = new Map<string, number>();

  let successTxns = 0;
  let reviewTxns = 0;
  let failedTxns = 0;

  for (const t of periodTxns) {
    const key = dateKeyLocal(new Date(t.createdAt));
    const bucket = dailyMap.get(key);
    if (!bucket) continue;

    if (t.status === "OK") {
      bucket.success += 1;
      successTxns += 1;
    } else if (t.status === "REVIEW") {
      bucket.review += 1;
      reviewTxns += 1;
    } else {
      bucket.failed += 1;
      failedTxns += 1;
    }

    serviceCounts.set(t.service, (serviceCounts.get(t.service) ?? 0) + 1);
  }

  let creditsSpent = 0;

  for (const row of usageRows) {
    const key = dateKeyLocal(new Date(row.createdAt));
    const bucket = dailyMap.get(key);
    if (!bucket) continue;

    const absDelta = Math.abs(row.delta);
    bucket.credits += absDelta;
    creditsSpent += absDelta;
  }

  const daily = Array.from(dailyMap.values());

  const topServices = Array.from(serviceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([service, count]) => ({
      service,
      count,
    }));

  const recentIds = recentTransactions.map((t) => t.id);
  const creditCosts = await getCreditCostsByTxnIds(recentIds);

  const recentTransactionsWithCost = recentTransactions.map((t) => ({
    ...t,
    creditCost: creditCosts[t.id] ?? null,
  }));

  return NextResponse.json({
    hasActivity: periodTxns.length > 0,
    kpis: {
      periodDays,
      totalTxns: periodTxns.length,
      successTxns,
      reviewTxns,
      failedTxns,
      creditsSpent,
      activeUsers: distinctUsers.length,
      activeOrganizations: distinctOrgs.length,
    },
    charts: {
      daily,
      topServices,
    },
    recentTransactions: recentTransactionsWithCost,
  });
}