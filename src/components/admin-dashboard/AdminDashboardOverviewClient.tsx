// src/components/admin-dashboard/AdminDashboardOverviewClient.tsx
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
import { Check, Hand } from "lucide-react";
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

type TopServicePoint = {
  service: string;
  count: number;
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
  user: {
    id: number;
    email: string;
    fullName: string | null;
  };
  organization: {
    id: number;
    name: string;
  } | null;
};

type OverviewPayload = {
  hasActivity: boolean;
  kpis: {
    periodDays: number;
    totalTxns: number;
    successTxns: number;
    reviewTxns: number;
    failedTxns: number;
    creditsSpent: number;
    activeUsers: number;
    activeOrganizations: number;
  };
  charts: {
    daily: DailyPoint[];
    topServices: TopServicePoint[];
  };
  recentTransactions: RecentTxn[];
};

function getServiceLabel(service: string) {
  return serviceRegistry[service]?.label ?? service;
}

function shortTxnId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
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

function getAccountLabel(t: RecentTxn) {
  return t.organization?.name || t.user.fullName || t.user.email;
}

function getAccountSubLabel(t: RecentTxn) {
  return t.organization
    ? t.user.fullName || t.user.email
    : t.user.fullName
      ? t.user.email
      : "Personal account";
}

export function AdminDashboardOverviewClient() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
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

    fetch("/api/admin/dashboard/overview", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((d) => {
        if (!alive) return;
        setData(d);
      })
      .catch((e) => {
        console.error("Admin dashboard overview failed:", e);
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
  const topServices = useMemo(() => data?.charts?.topServices ?? [], [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-100" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>We couldn’t load the admin overview.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Platform activity and operational signals for the last{" "}
          {data.kpis.periodDays} days.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {data.kpis.totalTxns}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {data.kpis.successTxns} OK • {data.kpis.reviewTxns} review •{" "}
              {data.kpis.failedTxns} failed
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Credits spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {data.kpis.creditsSpent}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Across all wallets in the period
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Active users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {data.kpis.activeUsers}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Distinct users with activity
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Active organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {data.kpis.activeOrganizations}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Distinct orgs with activity
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Successful vs failed</CardTitle>
            <CardDescription>Daily transaction outcomes</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {daily.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No activity in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickMargin={8}
                    tickFormatter={fmtChartDate}
                  />
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
                  <Bar
                    dataKey="success"
                    fill="#dff3ea"
                    stroke="#047857"
                    strokeWidth={1.5}
                  />
                  <Bar
                    dataKey="review"
                    fill="#f4ecd9"
                    stroke="#b45309"
                    strokeWidth={1.5}
                  />
                  <Bar
                    dataKey="failed"
                    fill="#e3e8ef"
                    stroke="#475569"
                    strokeWidth={1.5}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Credit usage</CardTitle>
            <CardDescription>Daily spent credits</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {daily.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No activity in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickMargin={8}
                    tickFormatter={fmtChartDate}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="credits" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Top services</CardTitle>
            <CardDescription>
              Most used services in the current period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topServices.length === 0 ? (
              <div className="text-sm text-slate-500">
                No service activity in this period.
              </div>
            ) : (
              <div className="space-y-3">
                {topServices.map((item) => (
                  <div
                    key={item.service}
                    className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {getServiceLabel(item.service)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.service}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-slate-900">
                      {item.count}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button asChild variant="outline">
                <Link href="/admin/transactions">Open transactions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Recent transactions</CardTitle>
              <CardDescription>
                Latest platform activity across all accounts
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <div className="text-sm text-slate-500">
                No transactions yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2 pr-4 font-medium">Time</th>
                      <th className="py-2 pr-4 font-medium">Service</th>
                      <th className="py-2 pr-4 font-medium">Account</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Credits</th>
                      <th className="py-2 pr-4 font-medium">Txn ID</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.recentTransactions.map((t) => (
                      <tr key={t.id} className="border-b last:border-b-0">
                        <td className="whitespace-nowrap py-2 pr-4">
                          {fmtDate(t.createdAt)}
                        </td>

                        <td className="whitespace-nowrap py-2 pr-4">
                          {getServiceLabel(t.service)}
                        </td>

                        <td className="py-2 pr-4">
                          <div className="max-w-[220px]">
                            <div className="truncate font-medium text-slate-900">
                              {getAccountLabel(t)}
                            </div>
                            <div className="truncate text-xs text-slate-500">
                              {getAccountSubLabel(t)}
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap py-2 pr-4">
                          <span className={statusPill(t.status)}>{t.status}</span>
                        </td>

                        <td className="whitespace-nowrap py-2 pr-4">
                          {t.creditCost == null ? "—" : t.creditCost}
                        </td>

                        <td className="whitespace-nowrap py-2 pr-4">
                          <button
                            type="button"
                            onClick={() => copyTxnId(t.id)}
                            title="Click to copy transaction ID"
                            className={`inline-flex max-w-[170px] items-center gap-2 font-mono tabular-nums text-xs transition ${
                              copiedId === t.id
                                ? "text-emerald-700"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <Hand className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            <span className="truncate">{shortTxnId(t.id)}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4 flex justify-end">
                  <Button asChild>
                    <Link href="/admin/transactions">Find out more</Link>
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