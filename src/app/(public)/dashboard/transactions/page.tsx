// src/app/(public)/dashboard/transactions/page.tsx
"use client";

import { useEffect, useState } from "react";
import { ServiceHeader } from "@/components/service-layout/ServiceHeader";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionsFilters } from "@/components/transactions/TransactionsFilters";
import { TransactionsPagination } from "@/components/transactions/TransactionsPagination";
import type { Transaction } from "@/lib/transactions/types";
import type { DateRange } from "react-day-picker";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);

  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(query && { query }),
      ...(dateRange?.from && { from: dateRange.from.toISOString() }),
      ...(dateRange?.to && { to: dateRange.to.toISOString() }),
    });

    statuses.forEach((s) => params.append("status", s));
    services.forEach((s) => params.append("service", s));

    fetch(`/api/transactions?${params}`)
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
        console.error("Transactions fetch failed:", err);
        setTransactions([]);
        setTotal(0);
      });
  }, [query, statuses, services, dateRange, page, pageSize]);

  return (
    <div className="space-y-6 min-w-0">
      <ServiceHeader
        title="Transactions"
        description="Browse and inspect all verification transactions."
      />

      <TransactionsFilters
        query={query}
        onQueryChange={(v) => {
          setQuery(v);
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
          setStatuses([]);
          setServices([]);
          setDateRange(undefined);
          setPage(1);
        }}
      />

      <TransactionList transactions={transactions} />

      <TransactionsPagination
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
