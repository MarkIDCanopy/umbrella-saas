// src/components/admin-users/AdminOrganizationsRow.tsx
"use client";

import { useState } from "react";
import type { AdminOrganizationListItem } from "./types";
import { ADMIN_ORGANIZATIONS_GRID } from "./AdminOrganizationsList";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
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

function statusBadge(org: AdminOrganizationListItem) {
  return org.teamEnabled
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-50 text-slate-700";
}

function statusLabel(org: AdminOrganizationListItem) {
  return org.teamEnabled ? "Team enabled" : "Team disabled";
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

export function AdminOrganizationsRow({
  organization,
  busy,
  onTopUpCredits,
  onDeleteOrganization,
}: {
  organization: AdminOrganizationListItem;
  busy: boolean;
  onTopUpCredits: (orgId: number, amount: number) => Promise<void>;
  onDeleteOrganization: (orgId: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [topup, setTopup] = useState("");

  const credits = organization.creditWallet?.balance ?? 0;
  const memberCount = organization.members.length;
  const billing = organization.creditWallet?.billingProfile;

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="px-4 py-2 hover:bg-slate-50">
        <div
          className="hidden lg:grid items-center gap-3"
          style={{ gridTemplateColumns: ADMIN_ORGANIZATIONS_GRID }}
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">
              {organization.name}
            </div>
            <div className="truncate text-xs text-slate-500">
              {organization.orgUid}
            </div>
          </div>

          <div className="whitespace-nowrap text-sm text-slate-900">
            {credits}
          </div>

          <div className="whitespace-nowrap text-sm text-slate-900">
            {memberCount}
          </div>

          <div className="whitespace-nowrap text-sm text-slate-700">
            {fmtDate(organization.lastTransactionAt)}
          </div>

          <div className="whitespace-nowrap">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                organization
              )}`}
            >
              {statusLabel(organization)}
            </span>
          </div>

          <button
            type="button"
            className="text-slate-400 hover:text-slate-700"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Collapse details" : "Expand details"}
          >
            <Chevron open={open} />
          </button>
        </div>

        <div className="space-y-2 lg:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-900">
                {organization.name}
              </div>
              <div className="truncate text-xs text-slate-500">
                {organization.orgUid}
              </div>
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
            <span>Credits: {credits}</span>
            <span>Members: {memberCount}</span>
            <span>{fmtDate(organization.lastTransactionAt)}</span>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                organization
              )}`}
            >
              {statusLabel(organization)}
            </span>
          </div>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t bg-muted/30 px-5 py-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Organization" value={organization.name} />
            <InfoCard label="UID" value={organization.orgUid} />
            <InfoCard label="Created" value={fmtDate(organization.createdAt)} />
            <InfoCard
              label="Created by"
              value={
                organization.createdByUser.fullName ||
                organization.createdByUser.email
              }
            />
            <InfoCard
              label="Team enabled"
              value={organization.teamEnabled ? "Yes" : "No"}
            />
            <InfoCard label="Credits" value={String(credits)} />
            <InfoCard
              label="Transactions"
              value={String(organization._count.transactions)}
            />
            <InfoCard
              label="Members"
              value={String(organization._count.members)}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-medium text-slate-900">
                Billing profile
              </div>

              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div>
                  <span className="text-slate-500">Type:</span>{" "}
                  {billing?.billingType || "—"}
                </div>
                <div>
                  <span className="text-slate-500">Billing email:</span>{" "}
                  {billing?.email || organization.billingEmail || "—"}
                </div>
                <div>
                  <span className="text-slate-500">Name / company:</span>{" "}
                  {billing?.companyName || billing?.fullName || "—"}
                </div>
                <div>
                  <span className="text-slate-500">Country:</span>{" "}
                  {billing?.country || organization.billingCountry || "—"}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-medium text-slate-900">Members</div>

              {organization.members.length === 0 ? (
                <div className="mt-3 text-sm text-slate-500">
                  No members in this organization.
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {organization.members.map((member) => {
                    const label =
                      member.user?.fullName ||
                      member.name ||
                      member.user?.email ||
                      member.email;

                    return (
                      <div
                        key={member.id}
                        className="rounded-full border bg-slate-50 px-3 py-1 text-xs text-slate-700"
                      >
                        {label} · {member.role}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-medium text-slate-900">
                Credit top-up
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="Credits"
                  value={topup}
                  onChange={(e) => setTopup(e.target.value)}
                />
                <Button
                  disabled={busy}
                  onClick={async () => {
                    const amount = Number(topup || "0");
                    await onTopUpCredits(organization.id, amount);
                    setTopup("");
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-medium text-slate-900">
                Organization actions
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={busy}>
                      Hard delete org
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hard delete organization?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes the organization, its members,
                        org wallet, billing profile, org transactions, favorites
                        and related invite tokens.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteOrganization(organization.id)}
                      >
                        Confirm delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Persistent org blocking is not available with the current schema.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-900 break-words">{value}</div>
    </div>
  );
}