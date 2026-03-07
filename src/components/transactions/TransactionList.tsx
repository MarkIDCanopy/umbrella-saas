// src/components/transactions/TransactionList.tsx
"use client";

import type { Transaction } from "@/lib/transactions/types";
import { TransactionRow } from "./TransactionRow";

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="space-y-2 min-w-0">
      <TransactionListHeader />
      {transactions.map((trx) => (
        <TransactionRow key={trx.id} trx={trx} />
      ))}
    </div>
  );
}

function TransactionListHeader() {
  return (
    <div
      className={[
        "hidden lg:grid items-center gap-4",
        "px-4 py-2",
        "text-[11px] uppercase tracking-wide text-muted-foreground",
        // must match TransactionRow grid
        "grid-cols-[minmax(140px,180px)_minmax(0,1fr)_minmax(120px,160px)_minmax(90px,120px)_minmax(60px,90px)_minmax(90px,100px)_minmax(70px,90px)_16px]",
      ].join(" ")}
    >
      <div>Service</div>
      <div className="min-w-0 truncate">Transaction ID</div>
      <div>Date</div>
      <div>Time</div>
      <div className="text-left">Credits</div>
      <div className="text-left">Status</div>
      <div className="text-left">Duration</div>
      <div />
    </div>
  );
}
