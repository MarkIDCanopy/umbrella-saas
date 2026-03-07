"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { serviceRegistry } from "@/lib/services/serviceRegistry";

// ✅ icons for copy + “finger”
import { Check, Hand } from "lucide-react";

// recharts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

type DailyPoint = {
  date: string;
  success: number;
  review: number;
  failed: number;
  credits: number;
};

type RecentTxn = {
  id: string;
  service: string;
  status: "OK" | "REVIEW" | "NOK" | "ERROR";
  createdAt: string;
  environment: "test" | "live";
  executionMode: "single" | "bulk";
  batchId: string | null;
  durationMs: number;
  creditCost: number | null;
};

type OverviewPayload = {
  hasBilling: boolean;
  hasActivity: boolean;
  wallet: { balance: number } | null;
  kpis: {
    periodDays: number;
    totalTxns: number;
    successTxns: number;
    reviewTxns: number;
    failedTxns: number;
    creditsSpent: number;
  };
  charts: {
    daily: DailyPoint[];
  };
  recentTransactions: RecentTxn[];
};

function getServiceLabel(service: string) {
  return serviceRegistry[service]?.label ?? service;
}

function statusPill(status: RecentTxn["status"]) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  switch (status) {
    case "OK":
      return `${base} bg-emerald-50 text-emerald-700`;
    case "REVIEW":
      return `${base} bg-amber-50 text-amber-700`;
    case "NOK":
      return `${base} bg-rose-50 text-rose-700`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
function fmtChartDate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
  });
}

export function DashboardOverviewClient() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ copy state for “recent transactions” table
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyTxnId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((cur) => (cur === id ? null : cur));
    }, 900);
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetch("/api/dashboard/overview", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((d) => {
        if (!alive) return;
        setData(d);
      })
      .catch((e) => {
        console.error("Dashboard overview failed:", e);
        if (!alive) return;
        setData(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const daily = useMemo(() => data?.charts?.daily ?? [], [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-100" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>We couldn’t load your overview.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  // If billing not set up -> show your welcome CTA
  if (!data.hasBilling) {
    return (
      <div className="flex min-h-[calc(100vh-56px-48px)] flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        <div className="space-y-2 max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Welcome to IDCanopy SaaS
          </h1>
          <p className="text-sm text-slate-600">
            Set up billing to activate usage analytics, transaction insights, and
            credit tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard/billing">Set up billing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/services">Explore available services</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard/settings?tab=organization">Company settings</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Activity and credit usage for the last {data.kpis.periodDays} days.
        </p>
      </section>

      {/* KPI cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Transactions (last {data.kpis.periodDays}d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {data.kpis.totalTxns}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {data.kpis.successTxns} OK • {data.kpis.reviewTxns} review • {data.kpis.failedTxns} failed
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Credits spent (last {data.kpis.periodDays}d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {data.kpis.creditsSpent}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Usage ledger (type=usage)
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Wallet balance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-semibold tracking-tight">
                {data.wallet?.balance ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Credits available</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/billing">Top up</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Successful vs failed</CardTitle>
            <CardDescription>Daily transactions</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickMargin={8} tickFormatter={fmtChartDate} />
                <YAxis allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                  }}
                  labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                  itemStyle={{ color: "#334155" }}
                  formatter={(value, name) => {
                    if (name === "success") return [value, "OK"];
                    if (name === "review") return [value, "Review"];
                    if (name === "failed") return [value, "Failed"];
                    return [value, name];
                  }}
                />
                <Bar dataKey="success" fill="#dff3ea" stroke="#047857" strokeWidth={1.5} />
                <Bar dataKey="review" fill="#f4ecd9" stroke="#b45309" strokeWidth={1.5} />
                <Bar dataKey="failed" fill="#e3e8ef" stroke="#475569" strokeWidth={1.5} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Credit usage</CardTitle>
            <CardDescription>Daily spent credits</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickMargin={8} tickFormatter={fmtChartDate} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="credits" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* Recent transactions (bottom) */}
      <section>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Recent transactions</CardTitle>
              <CardDescription>Quick glance at the latest activity</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <div className="text-sm text-slate-500">
                No transactions yet. Once you start sending traffic, they will show
                up here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2 pr-4 font-medium">Time</th>
                      <th className="py-2 pr-4 font-medium">Service</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Credits</th>
                      <th className="py-2 pr-4 font-medium">Txn ID</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.recentTransactions.map((t) => (
                      <tr key={t.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {fmtDate(t.createdAt)}
                        </td>

                        <td className="py-2 pr-4 whitespace-nowrap">
                          {getServiceLabel(t.service)}
                        </td>

                        <td className="py-2 pr-4 whitespace-nowrap">
                          <span className={statusPill(t.status)}>{t.status}</span>
                        </td>

                        <td className="py-2 pr-4 whitespace-nowrap">
                          {t.creditCost == null ? "—" : t.creditCost}
                        </td>

                        {/* ✅ Txn ID: no link, copy on click + finger icon */}
                        <td className="py-2 pr-4 whitespace-nowrap">
                            <button
                                type="button"
                                onClick={() => copyTxnId(t.id)}
                                title="Click to copy transaction ID"
                                className={`
                                inline-flex items-center gap-2 max-w-[200px]
                                font-mono tabular-nums text-xs transition
                                ${copiedId === t.id
                                    ? "text-emerald-700"
                                    : "text-slate-600 hover:text-slate-900"}
                                `}
                            >
                                <Hand className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                <span className="truncate">{t.id.slice(0, 8)}…</span>
                            </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4 flex justify-end">
                  <Button asChild>
                    <Link href="/dashboard/transactions">Find out more</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
