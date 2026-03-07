// src/components/settings/TeamSettings.tsx
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
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { MailPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/context/WorkspaceContext";

type Role = "owner" | "admin" | "user"; // ✅ viewer removed

type Member = {
  id: number;
  userId?: number | null;
  email: string;
  name?: string | null;
  role: Role;
  status: "active" | "invited";
};

type OrgRole = "owner" | "admin" | "user" | "viewer" | "personal" | null;

export function TeamSettings() {
  const { workspaceVersion } = useWorkspace();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("user");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [orgRole, setOrgRole] = useState<OrgRole>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const hasMembers = useMemo(() => members.length > 0, [members]);

  const canManageTeam = useMemo(() => {
    return orgRole === "owner" || orgRole === "admin";
  }, [orgRole]);

  const canAssignOwner = useMemo(() => {
    return orgRole === "owner";
  }, [orgRole]);

  function allowedRolesForActor(actor: OrgRole): Role[] {
    if (actor === "owner") return ["owner", "admin", "user"];
    if (actor === "admin") return ["admin", "user"];
    return ["user"];
  }

  function canEditMemberRole(actor: OrgRole, member: Member): boolean {
    if (!(actor === "owner" || actor === "admin")) return false;
    if (member.role === "owner") return actor === "owner"; // only owner can touch owners
    return true;
  }

  async function loadMembers() {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/organizations/members/list", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      setMembers((data.members || []) as Member[]);
    } catch {
      setMembers([]);
      setErrorMsg("Could not load team members.");
    } finally {
      setLoading(false);
    }
  }

  async function loadOrgRole() {
    setRoleLoading(true);
    try {
      const res = await fetch("/api/organizations/current/role", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      setOrgRole((data?.role ?? null) as OrgRole);
    } catch {
      setOrgRole(null);
    } finally {
      setRoleLoading(false);
    }
  }

  // ✅ refetch when workspace changes
  useEffect(() => {
    setLoading(true);
    setRoleLoading(true);
    setMembers([]);
    setErrorMsg(null);

    (async () => {
      await Promise.all([loadOrgRole(), loadMembers()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceVersion]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageTeam) return;

    setSubmitting(true);
    setErrorMsg(null);

    if (inviteRole === "owner" && !canAssignOwner) {
      setErrorMsg("Only the organization owner can invite/promote another owner.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/organizations/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.error ?? "Could not send invite.");
        return;
      }

      setInviteName("");
      setInviteEmail("");
      setInviteRole("user");
      await loadMembers();
    } finally {
      setSubmitting(false);
    }
  }

  async function changeRole(memberId: number, role: Role, member: Member) {
    setErrorMsg(null);

    if (!canEditMemberRole(orgRole, member)) {
      setErrorMsg("You don’t have permission to change this member’s role.");
      return;
    }

    if (role === "owner" && !canAssignOwner) {
      setErrorMsg("Only the organization owner can assign the owner role.");
      return;
    }

    try {
      const res = await fetch("/api/organizations/members/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.error ?? "Could not update role.");
        return;
      }

      await loadMembers();
    } catch {
      setErrorMsg("Could not update role.");
    }
  }

  async function removeMember(memberId: number, member: Member) {
    setErrorMsg(null);

    if (!canManageTeam) {
      setErrorMsg("You don’t have permission to remove members.");
      return;
    }

    // admins can't remove owners; only owner can
    if (member.role === "owner" && orgRole !== "owner") {
      setErrorMsg("Only the organization owner can remove an owner.");
      return;
    }

    try {
      const res = await fetch("/api/organizations/members/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.error ?? "Could not remove member.");
        return;
      }

      await loadMembers();
    } catch {
      setErrorMsg("Could not remove member.");
    }
  }

  if (loading || roleLoading) return <p>Loading team…</p>;

  const inviteRoleOptions = allowedRolesForActor(orgRole);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team members</CardTitle>
        <CardDescription>Invite teammates and manage permissions</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {errorMsg ? (
          <div className="rounded-md border bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}

        {/* Invite form */}
        <form
          onSubmit={invite}
          className={cn(
            "flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 text-sm md:flex-row md:items-center",
            !canManageTeam && "opacity-60"
          )}
        >
          <div className="flex items-center gap-2">
            <MailPlus className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Invite teammate</span>
          </div>

          <Input
            placeholder="Name"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            required
            className="md:w-40 w-full"
            disabled={!canManageTeam || submitting}
          />

          <Input
            placeholder="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="md:flex-1 w-full"
            disabled={!canManageTeam || submitting}
          />

          <Select
            value={inviteRole}
            onValueChange={(v: Role) => setInviteRole(v)}
            disabled={!canManageTeam || submitting}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {inviteRoleOptions.includes("owner") && (
                <SelectItem value="owner">Owner</SelectItem>
              )}
              {inviteRoleOptions.includes("admin") && (
                <SelectItem value="admin">Admin</SelectItem>
              )}
              {inviteRoleOptions.includes("user") && (
                <SelectItem value="user">User</SelectItem>
              )}
            </SelectContent>
          </Select>

          <Button type="submit" size="sm" disabled={!canManageTeam || submitting}>
            {submitting ? "Sending..." : "Send invite"}
          </Button>

          {!canManageTeam && (
            <span className="text-xs text-muted-foreground md:ml-2">
              Only admins and owners can invite members.
            </span>
          )}
        </form>

        {/* Members table */}
        <div className="overflow-hidden rounded-lg border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {!hasMembers ? (
                <tr className="border-t">
                  <td className="px-4 py-3 text-muted-foreground" colSpan={5}>
                    No team members yet.
                  </td>
                </tr>
              ) : (
                members.map((m, i) => {
                  const editable = canEditMemberRole(orgRole, m);
                  const roleOptions = allowedRolesForActor(orgRole);

                  return (
                    <tr
                      key={m.id}
                      className={cn("border-t", i % 2 === 1 && "bg-muted/40")}
                    >
                      <td className="px-4 py-2 max-w-[180px] truncate" title={m.name ?? ""}>
                        {m.name || "—"}
                      </td>

                      <td className="px-4 py-2 text-muted-foreground max-w-[260px] truncate" title={m.email}>
                        {m.email}
                      </td>

                      <td className="px-4 py-2">
                        <Select
                          value={m.role}
                          onValueChange={(r: Role) => changeRole(m.id, r, m)}
                          disabled={!editable}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            {/* Always show current role */}
                            {m.role === "owner" && <SelectItem value="owner">Owner</SelectItem>}
                            {m.role === "admin" && <SelectItem value="admin">Admin</SelectItem>}
                            {m.role === "user" && <SelectItem value="user">User</SelectItem>}

                            {/* Allowed transitions */}
                            {editable && roleOptions.includes("admin") && m.role !== "admin" && (
                              <SelectItem value="admin">Admin</SelectItem>
                            )}
                            {editable && roleOptions.includes("user") && m.role !== "user" && (
                              <SelectItem value="user">User</SelectItem>
                            )}
                            {editable && canAssignOwner && m.role !== "owner" && (
                              <SelectItem value="owner">Owner</SelectItem>
                            )}
                          </SelectContent>
                        </Select>

                        {!editable && (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {orgRole === "user"
                              ? "Only admins/owners can change roles."
                              : m.role === "owner"
                              ? "Only the owner can change an owner."
                              : "No permission."}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-2">
                        {m.status === "active" ? (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[11px] rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[11px] rounded-full">
                            Invited
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-2 text-right">
                        {canManageTeam && m.role !== "owner" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => removeMember(m.id, m)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}