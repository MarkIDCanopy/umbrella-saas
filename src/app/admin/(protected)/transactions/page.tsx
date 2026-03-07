// src/app/admin/(protected)/transactions/page.tsx
"use client";

import { useEffect, useState } from "react";
import { ServiceHeader } from "@/components/service-layout/ServiceHeader";
import { AdminTransactionList } from "@/components/admin-transactions/AdminTransactionsList";
import { AdminTransactionsFilters } from "@/components/admin-transactions/AdminTransactionsFilters";
import { AdminTransactionsPagination } from "@/components/admin-transactions/AdminTransactionsPagination";
import type { AdminTransaction } from "@/lib/admin-transactions/types";
import type { DateRange } from "react-day-picker";

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [total, setTotal] = useState(0);

  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(query && { query }),
      ...(actor && { actor }),
      ...(dateRange?.from && { from: dateRange.from.toISOString() }),
      ...(dateRange?.to && { to: dateRange.to.toISOString() }),
    });

    statuses.forEach((s) => params.append("status", s));
    services.forEach((s) => params.append("service", s));

    fetch(`/api/admin/transactions?${params}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text();
          throw new Error(text || `Request failed (${r.status})`);
        }
        return r.json();
      })
      .then((d) => {
        setTransactions(d.results ?? []);
        setTotal(d.total ?? 0);
      })
      .catch((err) => {
        console.error("Admin transactions fetch failed:", err);
        setTransactions([]);
        setTotal(0);
      });
  }, [query, actor, statuses, services, dateRange, page, pageSize]);

  return (
    <div className="space-y-6 min-w-0">
      <ServiceHeader
        title="Transactions"
        description="Browse all platform transactions across users and organizations."
      />

      <AdminTransactionsFilters
        query={query}
        onQueryChange={(v) => {
          setQuery(v);
          setPage(1);
        }}
        actor={actor}
        onActorChange={(v) => {
          setActor(v);
          setPage(1);
        }}
        statuses={statuses}
        onStatusesChange={(v) => {
          setStatuses(v);
          setPage(1);
        }}
        services={services}
        onServicesChange={(v) => {
          setServices(v);
          setPage(1);
        }}
        dateRange={dateRange}
        onDateRangeChange={(r) => {
          setDateRange(r);
          setPage(1);
        }}
        onReset={() => {
          setQuery("");
          setActor("");
          setStatuses([]);
          setServices([]);
          setDateRange(undefined);
          setPage(1);
        }}
      />

      <AdminTransactionList transactions={transactions} />

      <AdminTransactionsPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
      />
    </div>
  );
}