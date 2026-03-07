// src/components/admin-services/AdminServicesPageClient.tsx
// src/components/admin-services/AdminServicesPageClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminServiceListItem } from "./types";
import { AdminServicesList } from "./AdminServicesList";

export function AdminServicesPageClient() {
  const [services, setServices] = useState<AdminServiceListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const [createKey, setCreateKey] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPriceCredits, setCreatePriceCredits] = useState("");
  const [createFeatures, setCreateFeatures] = useState("");

  async function loadServices() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/services", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load services");
      setServices(data.results || []);
    } catch (e) {
      console.error(e);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  async function createService() {
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: createKey,
          name: createName,
          description: createDescription,
          priceCredits: Number(createPriceCredits),
          features: createFeatures
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");

      setCreateKey("");
      setCreateName("");
      setCreateDescription("");
      setCreatePriceCredits("");
      setCreateFeatures("");
      await loadServices();
    } catch (e: any) {
      alert(e.message || "Create failed");
    }
  }

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchesQuery =
        !query.trim() ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.key.toLowerCase().includes(query.toLowerCase()) ||
        (s.description || "").toLowerCase().includes(query.toLowerCase());

      const matchesStatus =
        status === "all" ||
        (status === "active" && s.active) ||
        (status === "inactive" && !s.active) ||
        (status === "country-pricing" && s.countryPrices.length > 0) ||
        (status === "operation-pricing" && s.operationPrices.length > 0);

      return matchesQuery && matchesStatus;
    });
  }, [services, query, status]);

  const summary = useMemo(() => {
    return {
      total: services.length,
      active: services.filter((s) => s.active).length,
      countryPricing: services.filter((s) => s.countryPrices.length > 0).length,
      operationPricing: services.filter((s) => s.operationPrices.length > 0).length,
    };
  }, [services]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Services
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage service catalog, default pricing, activation state,
          country-based prices and operation-based prices.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total services
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
              Active services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {summary.active}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Country-priced services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {summary.countryPricing}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Operation-priced services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {summary.operationPricing}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Create service</CardTitle>
          <CardDescription>
            Add a new service directly from the admin console. Operation pricing
            can be added after creation.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-4">
            <Input
              placeholder="Service key (e.g. phone-risk)"
              value={createKey}
              onChange={(e) => setCreateKey(e.target.value)}
            />
            <Input
              placeholder="Display name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
            <Input
              type="number"
              min={0}
              placeholder="Default credits"
              value={createPriceCredits}
              onChange={(e) => setCreatePriceCredits(e.target.value)}
            />
            <Button onClick={createService}>Create service</Button>
          </div>

          <Textarea
            placeholder="Description"
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
          />

          <Textarea
            placeholder={`Features, one per line\nExample:\nGlobal coverage\nReal-time validation`}
            value={createFeatures}
            onChange={(e) => setCreateFeatures(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Search services and narrow down by activation state, country pricing
            or operation pricing.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Input
            placeholder="Search by key, name or description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All services</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="country-pricing">Has country pricing</option>
            <option value="operation-pricing">Has operation pricing</option>
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
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-sm text-slate-500">
            No services found for the current filters.
          </CardContent>
        </Card>
      ) : (
        <AdminServicesList services={filtered} onRefresh={loadServices} />
      )}
    </div>
  );
}