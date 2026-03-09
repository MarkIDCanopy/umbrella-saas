// src/components/admin-users/AdminOrganizationsPanel.tsx
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
import type { AdminOrganizationListItem } from "./types";
import { AdminOrganizationsList } from "./AdminOrganizationsList";

export function AdminOrganizationsPanel() {
  const [organizations, setOrganizations] = useState<AdminOrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const [busyId, setBusyId] = useState<number | null>(null);

  async function loadOrganizations() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/admin/organizations?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load organizations");

      setOrganizations(data.results || []);
    } catch (e) {
      console.error(e);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrganizations();
  }, [query, status]);

  async function topUpOrgCredits(orgId: number, amount: number) {
    if (!Number.isInteger(amount) || amount <= 0) {
      alert("Enter a positive integer amount.");
      return;
    }

    try {
      setBusyId(orgId);

      const res = await fetch(`/api/admin/organizations/${orgId}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Top-up failed");

      await loadOrganizations();
    } catch (e: any) {
      alert(e.message || "Top-up failed");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteOrganization(orgId: number) {
    try {
      setBusyId(orgId);

      const res = await fetch(`/api/admin/organizations/${orgId}/delete`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      await loadOrganizations();
    } catch (e: any) {
      alert(e.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  const summary = useMemo(() => {
    const total = organizations.length;
    const teamEnabled = organizations.filter((o) => o.teamEnabled).length;
    const credited = organizations.filter(
      (o) => (o.creditWallet?.balance ?? 0) > 0
    ).length;

    return { total, teamEnabled, credited };
  }, [organizations]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total organizations
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
              Team enabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {summary.teamEnabled}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              With credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {summary.credited}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Search by organization name, UID, billing email or member.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Input
            placeholder="Search by org name, UID, email or member"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All organizations</option>
            <option value="team-enabled">Team enabled</option>
            <option value="with-credits">With credits</option>
            <option value="no-wallet">No wallet / zero credits</option>
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
      ) : organizations.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-sm text-slate-500">
            No organizations found for the current filters.
          </CardContent>
        </Card>
      ) : (
        <AdminOrganizationsList
          organizations={organizations}
          busyId={busyId}
          onTopUpCredits={topUpOrgCredits}
          onDeleteOrganization={deleteOrganization}
        />
      )}
    </div>
  );
}