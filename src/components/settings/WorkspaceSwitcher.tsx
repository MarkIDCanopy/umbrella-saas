// src/components/settings/WorkspaceSwitcher.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/context/WorkspaceContext";

type Workspace =
  | { kind: "personal"; id: "personal"; name: string }
  | { kind: "org"; id: number; name: string; role?: string };

type ApiErr = { error?: string } | null;

async function readApiError(res: Response): Promise<ApiErr> {
  const ct = res.headers.get("content-type") || "";
  const raw = await res.clone().text().catch(() => "");
  if (ct.includes("application/json")) {
    try {
      return (raw ? JSON.parse(raw) : null) as any;
    } catch {
      return { error: raw || `Request failed (${res.status})` };
    }
  }
  return { error: raw || `Request failed (${res.status})` };
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const { setActiveOrgId, bumpWorkspaceVersion } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [value, setValue] = useState<string>("personal");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isDisabled = loading || switching;

  const currentOrgId = useMemo(() => {
    return value === "personal" ? null : Number(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch("/api/workspaces", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        const ws: Workspace[] = Array.isArray(data.workspaces) ? data.workspaces : [];
        setWorkspaces(ws);

        const active = data.activeWorkspace;
        if (active?.kind === "org") {
          setValue(String(active.id));
          setActiveOrgId(Number(active.id));
        } else {
          setValue("personal");
          setActiveOrgId(null);
        }
      } catch (e) {
        if (!cancelled) setErrorMsg("Failed to load workspaces.");
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [setActiveOrgId]);

  async function switchWorkspace(next: string) {
    setErrorMsg(null);

    // no-op if same value or still busy
    if (next === value) return;
    if (switching) return;

    setSwitching(true);

    // optimistic UI (feels instant)
    setValue(next);

    const organizationId = next === "personal" ? null : Number(next);

    try {
      const res = await fetch("/api/session/active-org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });

      if (!res.ok) {
        const payload = await readApiError(res);
        console.error("Workspace switch failed", { status: res.status, payload });

        // revert UI to previous selection
        setValue(organizationId === null ? String(currentOrgId ?? "personal") : value);

        setErrorMsg(payload?.error || "Failed to switch workspace.");
        setSwitching(false);
        return;
      }

      // update local client contexts immediately (optional, but fine)
      setActiveOrgId(organizationId);
      bumpWorkspaceVersion();

      // router.refresh() is not enough for all client states -> hard refresh
      // Use assign instead of reload so it behaves consistently across browsers.
      window.location.assign(window.location.pathname + window.location.search);
    } catch (e) {
      console.error("Workspace switch crashed", e);

      // revert UI on crash
      setValue(value);

      setErrorMsg("Network error. Please try again.");
      setSwitching(false);
      return;
    }
  }

  return (
    <div className="space-y-2 max-w-sm">
      <Label>Workspace</Label>

      {errorMsg && (
        <div className="rounded-xl border bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <Select value={value} onValueChange={switchWorkspace} disabled={isDisabled}>
        <SelectTrigger>
          <SelectValue
            placeholder={
              loading ? "Loading..." : switching ? "Switching workspace..." : "Select workspace"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((w) => {
            const id = w.kind === "personal" ? "personal" : String(w.id);
            const label = w.kind === "personal" ? "Personal" : w.name;

            return (
              <SelectItem key={`${w.kind}-${id}`} value={id}>
                {label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}