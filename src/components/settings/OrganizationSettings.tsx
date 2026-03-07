// src/components/settings/OrganizationSettings.tsx
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
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import OrganizationCreateForm from "@/components/settings/OrganizationCreateForm";
import { useWorkspace } from "@/context/WorkspaceContext";

type OrgRole = "owner" | "admin" | "user" | "viewer" | "personal" | null;

export function OrganizationSettings() {
  const { workspaceVersion } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<any>(null);

  const [roleLoading, setRoleLoading] = useState(true);
  const [orgRole, setOrgRole] = useState<OrgRole>(null);

  // ✅ Load active org (refetch on workspace switch)
  useEffect(() => {
    let cancelled = false;

    // reset to avoid stale UI when switching workspace
    setLoading(true);
    setOrg(null);

    async function fetchOrg() {
      try {
        const res = await fetch("/api/organizations/current", {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!data.organization) {
          setOrg(null);
          setLoading(false);
          return;
        }

        setOrg({
          ...data.organization,
          teamEnabled: data.organization.teamEnabled,
        });
        setLoading(false);
      } catch {
        if (!cancelled) {
          setOrg(null);
          setLoading(false);
        }
      }
    }

    fetchOrg();
    return () => {
      cancelled = true;
    };
  }, [workspaceVersion]);

  // ✅ Load org role (only if org exists)
  useEffect(() => {
    let cancelled = false;

    async function fetchRole() {
      setRoleLoading(true);
      try {
        const res = await fetch("/api/organizations/current/role", {
          cache: "no-store",
        });

        if (!res.ok) {
          if (!cancelled) setOrgRole(null);
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        setOrgRole((data?.role ?? null) as OrgRole);
      } catch {
        if (!cancelled) setOrgRole(null);
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    }

    if (!org) {
      setOrgRole(null);
      setRoleLoading(false);
      return;
    }

    fetchRole();
    return () => {
      cancelled = true;
    };
  }, [org]);

  const canDeleteOrg = useMemo(() => orgRole === "owner", [orgRole]);

  if (loading) return <p>Loading…</p>;

  // No org yet → Show create component
  if (!org) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create an organization</CardTitle>
          <CardDescription>
            Invite teammates, manage permissions and centralize billing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationCreateForm
            onCreated={(createdOrg) => setOrg(createdOrg)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization</CardTitle>
          <CardDescription>Manage your organization details.</CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className="space-y-4 max-w-xl"
            onSubmit={async (e) => {
              e.preventDefault();

              await fetch(`/api/organizations/${org.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: org.name }),
              });

              const res = await fetch("/api/organizations/current", {
                cache: "no-store",
              });
              const data = await res.json().catch(() => ({}));

              if (!data.organization) {
                setOrg(null);
                return;
              }

              setOrg({
                ...data.organization,
                teamEnabled: data.organization.teamEnabled,
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Organization ID</Label>
              <Input value={org.orgUid ?? ""} readOnly />
            </div>

            <div className="space-y-1.5">
              <Label>Organization name</Label>
              <Input
                value={org.name}
                onChange={(e) => setOrg({ ...org, name: e.target.value })}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit">Save changes</Button>

              {!org.teamEnabled && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/organizations/${org.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ teamEnabled: true }),
                    });

                    // SPA redirect is fine here
                    window.location.href = "/dashboard/settings?tab=team";
                  }}
                >
                  Add team members
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete only for owners */}
      {roleLoading ? (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-base">Permissions</CardTitle>
            <CardDescription>Checking your role…</CardDescription>
          </CardHeader>
        </Card>
      ) : canDeleteOrg ? (
        <DeleteOrganizationSection orgId={org.id} />
      ) : (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-base">Delete organization</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Only the organization owner can delete the organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" disabled>
              Delete organization
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DeleteOrganizationSection({ orgId }: { orgId: number }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function remove() {
    setErr(null);
    setDeleting(true);

    const res = await fetch(`/api/organizations/${orgId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.error || "Failed to delete organization.");
      setDeleting(false);
      return;
    }

    window.location.reload();
  }

  return (
    <>
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Delete organization
          </CardTitle>
          <CardDescription className="text-xs text-destructive">
            This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {err && (
            <div className="rounded-xl border bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <Button
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
          >
            Delete organization
          </Button>
        </CardContent>
      </Card>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xl">
            <h2 className="text-xl font-semibold mb-2">
              Delete your organization?
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              This action is permanent and cannot be undone. All data associated
              with this organization will be permanently removed.
            </p>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={remove} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}