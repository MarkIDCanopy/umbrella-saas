// src/components/admin-transactions/AdminTransactionsList.tsx
"use client";

import type { AdminTransaction } from "@/lib/admin-transactions/types";
import { AdminTransactionRow } from "./AdminTransactionsRow";

// ✅ MUST match AdminTransactionsRow exactly
export const ADMIN_TXN_GRID = "220px 170px 240px 180px 80px 100px 24px";

export function AdminTransactionList({
  transactions,
}: {
  transactions: AdminTransaction[];
}) {
  return (
    <div className="space-y-2 min-w-0">
      <AdminTransactionListHeader />

      {transactions.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-8 text-sm text-muted-foreground">
          No transactions found for the current filters.
        </div>
      ) : (
        transactions.map((trx) => (
          <AdminTransactionRow key={trx.id} trx={trx} />
        ))
      )}
    </div>
  );
}

function AdminTransactionListHeader() {
  return (
    <div
      className="hidden lg:grid items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground"
      style={{ gridTemplateColumns: ADMIN_TXN_GRID }}
    >
      <div>Service</div>
      <div>Transaction ID</div>
      <div>Account</div>
      <div>Date</div>
      <div>Credits</div>
      <div>Status</div>
      <div />
    </div>
  );
}