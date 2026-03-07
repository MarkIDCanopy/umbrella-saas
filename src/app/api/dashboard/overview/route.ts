// src/app/api/dashboard/overview/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getCreditCostsByTxnIds } from "@/lib/transactions/credits.server";

function dayKeyLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, activeOrgId } = session;

  // Workspace-based scope:
  // - personal workspace => only personal txns of this user
  // - org workspace => all txns of this org
  const txnScope = activeOrgId
    ? { organizationId: activeOrgId }
    : { userId, organizationId: null };

  const wallet = await prisma.creditWallet.findFirst({
    where: activeOrgId ? { organizationId: activeOrgId } : { userId },
    select: {
      id: true,
      balance: true,
      billingProfile: { select: { id: true } },
    },
  });

  const hasBilling = Boolean(wallet?.billingProfile?.id);

  const totalTxnsAllTime = await prisma.transaction.count({
    where: txnScope,
  });

  // last 14 local days
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 13);
  start.setHours(0, 0, 0, 0);

  const txns = await prisma.transaction.findMany({
    where: {
      ...txnScope,
      createdAt: { gte: start },
    },
    select: {
      id: true,
      status: true,
      service: true,
      createdAt: true,
      durationMs: true,
      environment: true,
      executionMode: true,
      batchId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const recent = txns.slice(0, 8);

  const recentCosts = await getCreditCostsByTxnIds(recent.map((t) => t.id));
  const recentWithCost = recent.map((t) => ({
    ...t,
    creditCost: recentCosts[t.id] ?? null,
  }));

  let ok = 0;
  let review = 0;
  let nok = 0;
  let error = 0;

  for (const t of txns) {
    if (t.status === "OK") ok++;
    else if (t.status === "REVIEW") review++;
    else if (t.status === "NOK") nok++;
    else if (t.status === "ERROR") error++;
    else error++;
  }

  const successCount = ok;
  const reviewCount = review;
  const failCount = nok + error;
  const totalCount = txns.length;

  const usageRows = wallet?.id
    ? await prisma.creditTransaction.findMany({
        where: {
          walletId: wallet.id,
          type: "usage",
          createdAt: { gte: start },
        },
        select: { createdAt: true, delta: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const days: string[] = [];
  const dayBuckets: Record<
    string,
    { date: string; success: number; review: number; failed: number; credits: number }
  > = {};

  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dayKeyLocal(d);
    days.push(key);
    dayBuckets[key] = {
      date: key,
      success: 0,
      review: 0,
      failed: 0,
      credits: 0,
    };
  }

  for (const t of txns) {
    const k = dayKeyLocal(new Date(t.createdAt));
    const b = dayBuckets[k];
    if (!b) continue;

    if (t.status === "OK") b.success += 1;
    else if (t.status === "REVIEW") b.review += 1;
    else if (t.status === "NOK" || t.status === "ERROR") b.failed += 1;
  }

  for (const r of usageRows) {
    const k = dayKeyLocal(new Date(r.createdAt));
    const b = dayBuckets[k];
    if (!b) continue;
    b.credits += Math.abs(r.delta ?? 0);
  }

  const series = days.map((d) => dayBuckets[d]);
  const creditsSpent = series.reduce((sum, x) => sum + x.credits, 0);

  return NextResponse.json({
    hasBilling,
    hasActivity: totalTxnsAllTime > 0,
    wallet: wallet ? { balance: wallet.balance } : null,

    kpis: {
      periodDays: 14,
      totalTxns: totalCount,
      successTxns: successCount,
      reviewTxns: reviewCount,
      failedTxns: failCount,
      creditsSpent,
    },

    charts: {
      daily: series, // { date, success, review, failed, credits }
    },

    recentTransactions: recentWithCost,
  });
}