// src/components/admin-users/AdminUsersPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminUserListItem } from "./types";
import { AdminUsersList } from "./AdminUsersList";

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const [busyId, setBusyId] = useState<number | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");

      setUsers(data.results || []);
    } catch (e) {
      console.error(e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [query, status]);

  async function topUpCredits(userId: number, amount: number) {
    if (!Number.isInteger(amount) || amount <= 0) {
      alert("Enter a positive integer amount.");
      return;
    }

    try {
      setBusyId(userId);

      const res = await fetch(`/api/admin/users/${userId}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Top-up failed");

      await loadUsers();
    } catch (e: any) {
      alert(e.message || "Top-up failed");
    } finally {
      setBusyId(null);
    }
  }

  async function blockUser(
    userId: number,
    mode: "temporary" | "permanent",
    days = 7
  ) {
    try {
      setBusyId(userId);

      const res = await fetch(`/api/admin/users/${userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          days,
          reason:
            mode === "permanent"
              ? "Permanently blocked by admin"
              : `Temporarily blocked for ${days} days by admin`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Block failed");

      await loadUsers();
    } catch (e: any) {
      alert(e.message || "Block failed");
    } finally {
      setBusyId(null);
    }
  }

  async function unblockUser(userId: number) {
    try {
      setBusyId(userId);

      const res = await fetch(`/api/admin/users/${userId}/unblock`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unblock failed");

      await loadUsers();
    } catch (e: any) {
      alert(e.message || "Unblock failed");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(userId: number) {
    try {
      setBusyId(userId);

      const res = await fetch(`/api/admin/users/${userId}/delete`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      await loadUsers();
    } catch (e: any) {
      alert(e.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  const summary = useMemo(() => {
    const total = users.length;
    const blocked = users.filter((u) => {
      return u.isBlocked && (!u.blockedUntil || new Date(u.blockedUntil) > new Date());
    }).length;
    const admins = users.filter((u) => u.isAdmin).length;

    return { total, blocked, admins };
  }, [users]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {summary.total}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Blocked users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {summary.blocked}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Admin accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {summary.admins}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Search by user name or email and narrow down by status.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Input
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All users</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
            <option value="admins">Admins</option>
          </select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border bg-slate-100"
            />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-sm text-slate-500">
            No users found for the current filters.
          </CardContent>
        </Card>
      ) : (
        <AdminUsersList
          users={users}
          busyId={busyId}
          onTopUpCredits={topUpCredits}
          onBlockUser={blockUser}
          onUnblockUser={unblockUser}
          onDeleteUser={deleteUser}
        />
      )}
    </div>
  );
}