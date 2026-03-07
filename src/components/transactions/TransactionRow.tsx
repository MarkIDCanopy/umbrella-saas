// src/components/transactions/TransactionRow.tsx
"use client";

import React, { useState } from "react";
import type { Transaction } from "@/lib/transactions/types";
import { serviceRegistry } from "@/lib/services/serviceRegistry";
import { cn } from "@/lib/utils";
import { Hand, Check } from "lucide-react";

function fmtDateTime(iso: string) {
  const d = new Date(iso);

  const date = d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return { date, time, full: `${date} ${time}` };
}

function statusPill(status: Transaction["status"]) {
  const base =
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap";
  switch (status) {
    case "OK":
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
    case "REVIEW":
      return `${base} border-amber-200 bg-amber-50 text-amber-700`;
    case "NOK":
      return `${base} border-red-200 bg-red-50 text-red-700`;
    default:
      return `${base} border-slate-200 bg-slate-50 text-slate-700`;
  }
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function TransactionRow({ trx }: { trx: Transaction }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { date, time, full } = fmtDateTime(trx.createdAt);
  const service = serviceRegistry[trx.service];
  const uiResponse = service?.mapTxnResponse
    ? service.mapTxnResponse(trx.response)
    : trx.response;

  const credits =
    trx.creditCost === null || trx.creditCost === undefined
      ? "—"
      : String(trx.creditCost);

  function copyId(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(trx.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 900);
  }

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      {/* ROW */}
      <div className="px-4 py-3 hover:bg-slate-50">
        {/* Desktop/tablet (lg+) */}
        <div
          className={cn(
            "hidden lg:grid items-center gap-4 max-w-full",
            "grid-cols-[minmax(140px,180px)_minmax(0,1fr)_minmax(120px,160px)_minmax(90px,120px)_minmax(60px,90px)_minmax(90px,100px)_minmax(70px,90px)_16px]"
          )}
        >
          {/* Service */}
          <div className="truncate text-sm text-slate-900">
            {service?.label ?? trx.service}
          </div>

          {/* Transaction ID */}
          <div className="min-w-0 overflow-hidden">
            <button
              type="button"
              onClick={copyId}
              title="Click to copy transaction ID"
              className={cn(
                "group w-full min-w-0 text-left",
                "inline-flex items-center gap-2",
                "font-mono text-xs overflow-hidden",
                "cursor-pointer",
                copied
                  ? "text-emerald-700"
                  : "text-slate-700 hover:text-slate-900"
              )}
            >
              <span className="truncate min-w-0">{trx.id}</span>
              <Hand className="h-4 w-4 shrink-0 hidden group-hover:block opacity-60" />
            </button>

            {copied && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700">
                <Check className="h-3 w-3" />
                Copied
              </div>
            )}
          </div>

          {/* Date */}
          <div className="text-sm text-slate-700 whitespace-nowrap">{date}</div>
          {/* Time */}
          <div className="text-sm text-slate-700 whitespace-nowrap">{time}</div>

          {/* Credits */}
          <div className="text-sm text-slate-900 whitespace-nowrap">{credits}</div>

          {/* Status */}
          <div className="whitespace-nowrap">
            <span className={statusPill(trx.status)}>{trx.status}</span>
          </div>

          {/* Duration */}
          <div className="text-sm text-slate-700 whitespace-nowrap">
            {trx.durationMs}ms
          </div>

          {/* Chevron */}
          <button
            type="button"
            className="text-slate-400 hover:text-slate-700"
            aria-label={open ? "Collapse details" : "Expand details"}
            title={open ? "Collapse details" : "Expand details"}
            onClick={() => setOpen((v) => !v)}
          >
            <Chevron open={open} />
          </button>
        </div>

        {/* Mobile */}
        <div className="lg:hidden space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">
                {service?.label ?? trx.service}
              </div>

              <button
                type="button"
                onClick={copyId}
                title="Click to copy transaction ID"
                className={cn(
                  "mt-1 group w-full text-left",
                  "inline-flex items-center gap-2",
                  "font-mono text-xs truncate",
                  "cursor-pointer",
                  copied
                    ? "text-emerald-700"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <span className="truncate">{trx.id}</span>
                <Hand className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100" />
              </button>

              {copied && (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700">
                  <Check className="h-3 w-3" />
                  Copied
                </div>
              )}
            </div>

            <button
              type="button"
              className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-100"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Collapse details" : "Expand details"}
            >
              <Chevron open={open} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span className="whitespace-nowrap">{full}</span>
            <span className="whitespace-nowrap">{trx.durationMs}ms</span>
            <span className="whitespace-nowrap">Credits: {credits}</span>
            <span className={statusPill(trx.status)}>{trx.status}</span>
          </div>
        </div>
      </div>

      {/* EXPANDED */}
      {open && (
        <div className="space-y-6 border-t bg-muted/30 px-6 py-5">
          {service?.RequestSummary ? (
            <service.RequestSummary request={trx.request ?? null} />
          ) : null}

          {service?.OutputPanel ? (
            <service.OutputPanel
              mode="live"
              response={uiResponse}
              requestFromTxn={trx.request}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}