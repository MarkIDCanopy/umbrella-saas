// src/components/admin-console-users/AdminConsoleUsersPageClient.tsx
"use client";

import { useEffect, useState } from "react";
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

type AdminConsoleUser = {
  id: number;
  email: string;
  fullName: string | null;
  createdAt: string;
  updatedAt: string;
  emailVerifiedAt: string | null;
  isBlocked: boolean;
  blockedUntil: string | null;
  blockedReason: string | null;
  adminRole: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function statusLabel(user: AdminConsoleUser) {
  const blocked =
    user.isBlocked &&
    (!user.blockedUntil || new Date(user.blockedUntil) > new Date());

  if (blocked) return "Blocked";
  return "Active";
}

function statusClasses(user: AdminConsoleUser) {
  const blocked =
    user.isBlocked &&
    (!user.blockedUntil || new Date(user.blockedUntil) > new Date());

  return blocked
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function AdminConsoleUsersPageClient() {
  const [users, setUsers] = useState<AdminConsoleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admin-users", {
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
    loadUsers();
  }, []);

  async function addAdminUser() {
    try {
      setSubmitting(true);

      const res = await fetch("/api/admin/admin-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          fullName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add admin user");

      setEmail("");
      setFullName("");
      await loadUsers();
    } catch (e: any) {
      alert(e.message || "Failed to add admin user");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendReset(userId: number) {
    try {
      setBusyId(userId);

      const res = await fetch(
        `/api/admin/admin-users/${userId}/reset-password`,
        {
          method: "POST",
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reset email");

      alert("Password reset email sent.");
    } catch (e: any) {
      alert(e.message || "Failed to send reset email");
    } finally {
      setBusyId(null);
    }
  }

  async function removeAdminAccess(userId: number) {
    try {
      setBusyId(userId);

      const res = await fetch(`/api/admin/admin-users/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove access");

      await loadUsers();
    } catch (e: any) {
      alert(e.message || "Failed to remove access");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Admin users
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Add people to the admin console, resend password setup emails, or remove internal access.
        </p>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Add admin console user</CardTitle>
          <CardDescription>
            If the user already exists, they will be granted admin access and receive a password reset email.
            If they do not exist yet, an internal admin account will be created and the email will be sent.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 xl:grid-cols-[1fr_1fr_160px]">
          <Input
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <Input
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button disabled={submitting} onClick={addAdminUser}>
            {submitting ? "Sending..." : "Add user"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Current admin console users</CardTitle>
          <CardDescription>
            Delete here means removing access to the admin console, not deleting the main user account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl border bg-slate-100"
                />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-sm text-slate-500">
              No admin console users yet.
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border bg-white px-4 py-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {user.fullName || user.email}
                        </div>

                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClasses(
                            user
                          )}`}
                        >
                          {statusLabel(user)}
                        </span>

                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {user.adminRole || "admin"}
                        </span>
                      </div>

                      <div className="mt-1 truncate text-sm text-slate-500">
                        {user.email}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>Created: {fmtDate(user.createdAt)}</span>
                        <span>Verified: {user.emailVerifiedAt ? "Yes" : "No"}</span>
                        <span>Last update: {fmtDate(user.updatedAt)}</span>
                      </div>

                      {user.blockedReason ? (
                        <div className="mt-2 text-xs text-amber-700">
                          Block reason: {user.blockedReason}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={busyId === user.id}
                        onClick={() => sendReset(user.id)}
                      >
                        Reset password
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            disabled={busyId === user.id}
                          >
                            Delete
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove admin console access?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes access to the internal admin console and signs the user out of admin sessions.
                              Their main SaaS account remains intact.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeAdminAccess(user.id)}
                            >
                              Confirm
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}