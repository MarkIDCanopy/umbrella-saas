// src/components/admin-users/AdminUsersRow.tsx
"use client";

import { useState } from "react";
import type { AdminUserListItem } from "./types";
import { ADMIN_USERS_GRID } from "./AdminUsersList";
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

function statusBadge(user: AdminUserListItem) {
  const currentlyBlocked =
    user.isBlocked &&
    (!user.blockedUntil || new Date(user.blockedUntil) > new Date());

  if (currentlyBlocked) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function statusLabel(user: AdminUserListItem) {
  const currentlyBlocked =
    user.isBlocked &&
    (!user.blockedUntil || new Date(user.blockedUntil) > new Date());

  if (currentlyBlocked) {
    return user.blockedUntil ? "Blocked" : "Permanent";
  }

  return "Active";
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

export function AdminUsersRow({
  user,
  busy,
  onTopUpCredits,
  onBlockUser,
  onUnblockUser,
  onDeleteUser,
}: {
  user: AdminUserListItem;
  busy: boolean;
  onTopUpCredits: (userId: number, amount: number) => Promise<void>;
  onBlockUser: (
    userId: number,
    mode: "temporary" | "permanent",
    days?: number
  ) => Promise<void>;
  onUnblockUser: (userId: number) => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [topup, setTopup] = useState("");

  const displayName = user.fullName || user.email;
  const credits = user.creditWallet?.balance ?? 0;
  const orgCount = user.organizationMembers.length;
  const billing = user.creditWallet?.billingProfile;

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="px-4 py-2 hover:bg-slate-50">
        <div
          className="hidden lg:grid items-center gap-3"
          style={{ gridTemplateColumns: ADMIN_USERS_GRID }}
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">
              {displayName}
            </div>
            <div className="truncate text-xs text-slate-500">{user.email}</div>
          </div>

          <div className="whitespace-nowrap text-sm text-slate-900">
            {credits}
          </div>

          <div className="whitespace-nowrap text-sm text-slate-900">
            {orgCount}
          </div>

          <div className="whitespace-nowrap text-sm text-slate-700">
            {fmtDate(user.lastTransactionAt)}
          </div>

          <div className="whitespace-nowrap">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                user
              )}`}
            >
              {statusLabel(user)}
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
                {displayName}
              </div>
              <div className="truncate text-xs text-slate-500">{user.email}</div>
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
            <span>Orgs: {orgCount}</span>
            <span>{fmtDate(user.lastTransactionAt)}</span>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                user
              )}`}
            >
              {statusLabel(user)}
            </span>
          </div>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t bg-muted/30 px-5 py-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Name" value={displayName} />
            <InfoCard label="Email" value={user.email} />
            <InfoCard label="Country" value={user.country || "—"} />
            <InfoCard label="Created" value={fmtDate(user.createdAt)} />
            <InfoCard
              label="Email verified"
              value={user.emailVerifiedAt ? "Yes" : "No"}
            />
            <InfoCard label="Credits" value={String(credits)} />
            <InfoCard
              label="Transactions"
              value={String(user._count.transactions)}
            />
            <InfoCard
              label="Admin role"
              value={user.isAdmin ? user.adminRole || "admin" : "—"}
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
                  {billing?.email || "—"}
                </div>
                <div>
                  <span className="text-slate-500">Name / company:</span>{" "}
                  {billing?.companyName || billing?.fullName || "—"}
                </div>
                <div>
                  <span className="text-slate-500">Country:</span>{" "}
                  {billing?.country || "—"}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-medium text-slate-900">
                Organization memberships
              </div>

              {user.organizationMembers.length === 0 ? (
                <div className="mt-3 text-sm text-slate-500">
                  No active organization memberships.
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.organizationMembers.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-full border bg-slate-50 px-3 py-1 text-xs text-slate-700"
                    >
                      {m.organization.name} · {m.role}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {user.isBlocked && user.blockedReason ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="font-medium">Block reason</div>
              <div className="mt-1">{user.blockedReason}</div>
            </div>
          ) : null}

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
                    await onTopUpCredits(user.id, amount);
                    setTopup("");
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-medium text-slate-900">
                Account actions
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => onBlockUser(user.id, "temporary", 7)}
                >
                  Block 7d
                </Button>

                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => onBlockUser(user.id, "permanent")}
                >
                  Permanent block
                </Button>

                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => onUnblockUser(user.id)}
                >
                  Unblock
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={busy}>
                      Hard delete
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hard delete user?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes the user and their directly
                        related data. If the user created organizations, the delete
                        will be blocked until those organizations are reassigned or removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteUser(user.id)}>
                        Confirm delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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