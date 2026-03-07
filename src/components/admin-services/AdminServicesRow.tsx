// src/components/admin-services/AdminServicesRow.tsx
// src/components/admin-services/AdminServicesRow.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AdminServiceCountryPrice,
  AdminServiceListItem,
  AdminServiceOperationPrice,
} from "./types";
import { ADMIN_SERVICES_GRID } from "./AdminServicesList";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

function statusBadge(active: boolean) {
  return active
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-100 text-slate-700";
}

function featuresToText(features: string[]) {
  return features.join("\n");
}

export function AdminServicesRow({
  service,
  onRefresh,
}: {
  service: AdminServiceListItem;
  onRefresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description || "");
  const [priceCredits, setPriceCredits] = useState(String(service.priceCredits));
  const [featuresText, setFeaturesText] = useState(
    featuresToText(service.features)
  );

  const [newCountryCode, setNewCountryCode] = useState("");
  const [newPriceEur, setNewPriceEur] = useState("");
  const [newCountryActive, setNewCountryActive] = useState(true);

  const [newOperationKey, setNewOperationKey] = useState("");
  const [newOperationCredits, setNewOperationCredits] = useState("");
  const [newOperationActive, setNewOperationActive] = useState(true);

  const [countryRows, setCountryRows] = useState<
    Array<AdminServiceCountryPrice & { draftPriceEur: string }>
  >(
    service.countryPrices.map((p) => ({
      ...p,
      draftPriceEur: String(p.priceEur),
    }))
  );

  const [operationRows, setOperationRows] = useState<
    Array<AdminServiceOperationPrice & { draftPriceCredits: string }>
  >(
    service.operationPrices.map((p) => ({
      ...p,
      draftPriceCredits: String(p.priceCredits),
    }))
  );

  useEffect(() => {
    setName(service.name);
    setDescription(service.description || "");
    setPriceCredits(String(service.priceCredits));
    setFeaturesText(featuresToText(service.features));

    setCountryRows(
      service.countryPrices.map((p) => ({
        ...p,
        draftPriceEur: String(p.priceEur),
      }))
    );

    setOperationRows(
      service.operationPrices.map((p) => ({
        ...p,
        draftPriceCredits: String(p.priceCredits),
      }))
    );
  }, [service]);

  const activeCountryCount = useMemo(
    () => countryRows.filter((p) => p.active).length,
    [countryRows]
  );

  const activeOperationCount = useMemo(
    () => operationRows.filter((p) => p.active).length,
    [operationRows]
  );

  async function saveService() {
    try {
      setBusy(true);

      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          priceCredits: Number(priceCredits),
          features: featuresText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      await onRefresh();
    } catch (e: any) {
      alert(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleService() {
    try {
      setBusy(true);

      const res = await fetch(`/api/admin/services/${service.id}/toggle`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Toggle failed");

      await onRefresh();
    } catch (e: any) {
      alert(e.message || "Toggle failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteService() {
    try {
      setBusy(true);

      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      await onRefresh();
    } catch (e: any) {
      alert(e.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function addCountryPrice() {
    try {
      setBusy(true);

      const res = await fetch(
        `/api/admin/services/${service.id}/country-prices`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            countryCode: newCountryCode,
            priceEur: Number(newPriceEur),
            active: newCountryActive,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Add country price failed");

      setNewCountryCode("");
      setNewPriceEur("");
      setNewCountryActive(true);
      await onRefresh();
    } catch (e: any) {
      alert(e.message || "Add country price failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveCountryPrice(
    priceId: number,
    priceEur: string,
    active: boolean
  ) {
    try {
      setBusy(true);

      const res = await fetch(
        `/api/admin/services/${service.id}/country-prices/${priceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceEur: Number(priceEur),
            active,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update country price failed");

      await onRefresh();
    } catch (e: any) {
      alert(e.message || "Update country price failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeCountryPrice(priceId: number) {
    try {
      setBusy(true);

      const res = await fetch(
        `/api/admin/services/${service.id}/country-prices/${priceId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete country price failed");

      await onRefresh();
    } catch (e: any) {
      alert(e.message || "Delete country price failed");
    } finally {
      setBusy(false);
    }
  }

  async function addOperationPrice() {
    try {
      setBusy(true);

      const res = await fetch(
        `/api/admin/services/${service.id}/operation-prices`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operationKey: newOperationKey,
            priceCredits: Number(newOperationCredits),
            active: newOperationActive,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Add operation price failed");

      setNewOperationKey("");
      setNewOperationCredits("");
      setNewOperationActive(true);
      await onRefresh();
    } catch (e: any) {
      alert(e.message || "Add operation price failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveOperationPrice(
    priceId: number,
    priceCreditsValue: string,
    active: boolean
  ) {
    try {
      setBusy(true);

      const res = await fetch(
        `/api/admin/services/${service.id}/operation-prices/${priceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceCredits: Number(priceCreditsValue),
            active,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Update operation price failed");

      await onRefresh();
    } catch (e: any) {
      alert(e.message || "Update operation price failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeOperationPrice(priceId: number) {
    try {
      setBusy(true);

      const res = await fetch(
        `/api/admin/services/${service.id}/operation-prices/${priceId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Delete operation price failed");

      await onRefresh();
    } catch (e: any) {
      alert(e.message || "Delete operation price failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="px-4 py-2 hover:bg-slate-50">
        <div
          className="hidden items-center gap-3 lg:grid"
          style={{ gridTemplateColumns: ADMIN_SERVICES_GRID }}
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">
              {service.name}
            </div>
            <div className="truncate text-xs text-slate-500">
              {service.description || "No description"}
            </div>
          </div>

          <div className="truncate font-mono text-xs text-slate-700">
            {service.key}
          </div>

          <div className="whitespace-nowrap text-sm text-slate-900">
            {service.priceCredits}
          </div>

          <div className="whitespace-nowrap text-sm text-slate-900">
            {activeCountryCount} / {countryRows.length}
          </div>

          <div className="whitespace-nowrap text-sm text-slate-900">
            {activeOperationCount} / {operationRows.length}
          </div>

          <div className="whitespace-nowrap">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                service.active
              )}`}
            >
              {service.active ? "Active" : "Inactive"}
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
                {service.name}
              </div>
              <div className="truncate text-xs font-mono text-slate-500">
                {service.key}
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
            <span>Credits: {service.priceCredits}</span>
            <span>Country prices: {activeCountryCount}</span>
            <span>Operation prices: {activeOperationCount}</span>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                service.active
              )}`}
            >
              {service.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t bg-muted/30 px-5 py-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-medium text-slate-900">
                Basic settings
              </div>

              <div className="mt-4 space-y-3">
                <Input value={service.key} disabled />

                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Service name"
                />

                <Input
                  type="number"
                  min={0}
                  value={priceCredits}
                  onChange={(e) => setPriceCredits(e.target.value)}
                  placeholder="Default credits"
                />

                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                />

                <Textarea
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder={`Features, one per line\nGlobal coverage\nReal-time validation`}
                />

                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy} onClick={saveService}>
                    Save changes
                  </Button>

                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={toggleService}
                  >
                    {service.active ? "Deactivate" : "Activate"}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={busy}>
                        Delete
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete service?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This deletes the service only if it has no credit
                          transaction history. Otherwise, deactivate it instead.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteService}>
                          Confirm delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-medium text-slate-900">
                Service info
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <InfoCard
                  label="Status"
                  value={service.active ? "Active" : "Inactive"}
                />
                <InfoCard
                  label="Default credits"
                  value={String(service.priceCredits)}
                />
                <InfoCard
                  label="Country prices"
                  value={`${activeCountryCount} active / ${countryRows.length} total`}
                />
                <InfoCard
                  label="Operation prices"
                  value={`${activeOperationCount} active / ${operationRows.length} total`}
                />
                <InfoCard
                  label="Usage ledger refs"
                  value={String(service._count.creditTransactions)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-medium text-slate-900">
              Country-based pricing
            </div>

            <div className="mt-4 grid gap-2 xl:grid-cols-[120px_160px_120px_140px]">
              <Input
                placeholder="Country code"
                value={newCountryCode}
                onChange={(e) => setNewCountryCode(e.target.value.toUpperCase())}
              />
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder="Price EUR"
                value={newPriceEur}
                onChange={(e) => setNewPriceEur(e.target.value)}
              />
              <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={newCountryActive}
                  onChange={(e) => setNewCountryActive(e.target.checked)}
                />
                Active
              </label>
              <Button disabled={busy} onClick={addCountryPrice}>
                Add / upsert
              </Button>
            </div>

            {countryRows.length === 0 ? (
              <div className="mt-4 text-sm text-slate-500">
                No country-specific prices configured.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {countryRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid gap-2 rounded-xl border p-3 xl:grid-cols-[100px_160px_120px_120px_120px]"
                  >
                    <Input value={row.countryCode} disabled />

                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={row.draftPriceEur}
                      onChange={(e) =>
                        setCountryRows((prev) =>
                          prev.map((p) =>
                            p.id === row.id
                              ? { ...p, draftPriceEur: e.target.value }
                              : p
                          )
                        )
                      }
                    />

                    <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(e) =>
                          setCountryRows((prev) =>
                            prev.map((p) =>
                              p.id === row.id
                                ? { ...p, active: e.target.checked }
                                : p
                            )
                          )
                        }
                      />
                      Active
                    </label>

                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        saveCountryPrice(row.id, row.draftPriceEur, row.active)
                      }
                    >
                      Save
                    </Button>

                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => removeCountryPrice(row.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-medium text-slate-900">
              Operation-based pricing
            </div>

            <div className="mt-4 grid gap-2 xl:grid-cols-[1fr_160px_120px_140px]">
              <Input
                placeholder="Operation key"
                value={newOperationKey}
                onChange={(e) => setNewOperationKey(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                placeholder="Credits"
                value={newOperationCredits}
                onChange={(e) => setNewOperationCredits(e.target.value)}
              />
              <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={newOperationActive}
                  onChange={(e) => setNewOperationActive(e.target.checked)}
                />
                Active
              </label>
              <Button disabled={busy} onClick={addOperationPrice}>
                Add / upsert
              </Button>
            </div>

            {operationRows.length === 0 ? (
              <div className="mt-4 text-sm text-slate-500">
                No operation-specific prices configured.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {operationRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid gap-2 rounded-xl border p-3 xl:grid-cols-[1fr_160px_120px_120px_120px]"
                  >
                    <Input value={row.operationKey} disabled />

                    <Input
                      type="number"
                      min={0}
                      value={row.draftPriceCredits}
                      onChange={(e) =>
                        setOperationRows((prev) =>
                          prev.map((p) =>
                            p.id === row.id
                              ? {
                                  ...p,
                                  draftPriceCredits: e.target.value,
                                }
                              : p
                          )
                        )
                      }
                    />

                    <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(e) =>
                          setOperationRows((prev) =>
                            prev.map((p) =>
                              p.id === row.id
                                ? { ...p, active: e.target.checked }
                                : p
                            )
                          )
                        }
                      />
                      Active
                    </label>

                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        saveOperationPrice(
                          row.id,
                          row.draftPriceCredits,
                          row.active
                        )
                      }
                    >
                      Save
                    </Button>

                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => removeOperationPrice(row.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-900">{value}</div>
    </div>
  );
}