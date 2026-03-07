// src/components/admin-transactions/AdminTransactionsRow.tsx
"use client";

import React, { useState } from "react";
import type { AdminTransaction } from "@/lib/admin-transactions/types";
import { serviceRegistry } from "@/lib/services/serviceRegistry";
import { cn } from "@/lib/utils";
import { Hand, Check } from "lucide-react";

const ADMIN_TXN_GRID = "220px 170px 240px 180px 80px 100px 24px";

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

function shortTxnId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function statusPill(status: AdminTransaction["status"]) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";

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

export function AdminTransactionRow({ trx }: { trx: AdminTransaction }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { full } = fmtDateTime(trx.createdAt);
  const service = serviceRegistry[trx.service];
  const uiResponse = service?.mapTxnResponse
    ? service.mapTxnResponse(trx.response)
    : trx.response;

  const credits =
    trx.creditCost === null || trx.creditCost === undefined
      ? "—"
      : String(trx.creditCost);

  const userDisplay = trx.user.fullName || trx.user.email;
  const shortId = shortTxnId(trx.id);

  const accountPrimary = trx.organization?.name || userDisplay;
  const accountSecondary = trx.organization
    ? userDisplay
    : trx.user.fullName
      ? trx.user.email
      : "Personal account";

  function copyId(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(trx.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 900);
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="px-4 py-2 hover:bg-slate-50">
        {/* Desktop/table mode */}
        <div
          className="hidden lg:grid items-center gap-3"
          style={{ gridTemplateColumns: ADMIN_TXN_GRID }}
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">
              {service?.label ?? trx.service}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden">
            <button
              type="button"
              onClick={copyId}
              title={trx.id}
              className={cn(
                "group inline-flex items-center gap-2 font-mono text-xs",
                copied
                  ? "text-emerald-700"
                  : "text-slate-700 hover:text-slate-900"
              )}
            >
              <span className="truncate">{shortId}</span>
              <Hand className="h-4 w-4 shrink-0 hidden opacity-60 group-hover:block" />
            </button>

            {copied && (
              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-700">
                <Check className="h-3 w-3" />
                Copied
              </div>
            )}
          </div>

          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-medium text-slate-900">
              {accountPrimary}
            </div>
            <div className="truncate text-xs text-slate-500">
              {accountSecondary}
            </div>
          </div>

          <div className="whitespace-nowrap text-sm text-slate-700">{full}</div>

          <div className="whitespace-nowrap text-sm text-slate-900">{credits}</div>

          <div className="whitespace-nowrap">
            <span className={statusPill(trx.status)}>{trx.status}</span>
          </div>

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

        {/* Mobile / narrower screens */}
        <div className="space-y-2 lg:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-900">
                {service?.label ?? trx.service}
              </div>

              <div className="mt-1 truncate text-sm text-slate-800">
                {accountPrimary}
              </div>

              <div className="truncate text-xs text-slate-500">
                {accountSecondary}
              </div>

              <button
                type="button"
                onClick={copyId}
                title={trx.id}
                className={cn(
                  "mt-1 group inline-flex items-center gap-2 font-mono text-xs",
                  copied
                    ? "text-emerald-700"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <span className="truncate">{shortId}</span>
                <Hand className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100" />
              </button>

              {copied && (
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-700">
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
            <span className="whitespace-nowrap">Credits: {credits}</span>
            <span className={statusPill(trx.status)}>{trx.status}</span>
          </div>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t bg-muted/30 px-5 py-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetaItem label="Transaction ID" value={trx.id} />
            <MetaItem label="User" value={userDisplay} />
            <MetaItem label="Email" value={trx.user.email} />
            <MetaItem
              label="Organization"
              value={trx.organization?.name || "Personal account"}
            />
            <MetaItem label="Environment" value={trx.environment} />
            <MetaItem label="Execution mode" value={trx.executionMode} />
            <MetaItem label="Credits" value={credits} />
            <MetaItem label="Duration" value={`${trx.durationMs}ms`} />
          </div>

          {service?.RequestSummary ? (
            <service.RequestSummary request={trx.request ?? null} />
          ) : null}

          {service?.OutputPanel ? (
            <service.OutputPanel
              mode={trx.environment}
              response={uiResponse}
              requestFromTxn={trx.request}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm text-slate-900">{value}</div>
    </div>
  );
}