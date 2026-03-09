// src/components/admin-users/AdminUsersPageClient.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminUsersPanel } from "./AdminUsersPanel";
import { AdminOrganizationsPanel } from "./AdminOrganizationsPanel";

export function AdminUsersPageClient() {
  const [view, setView] = useState<"users" | "organizations">("users");

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Users & organizations
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review users, organizations, memberships, credits, billing details and account status.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={view === "users" ? "default" : "outline"}
          onClick={() => setView("users")}
        >
          Users
        </Button>

        <Button
          type="button"
          variant={view === "organizations" ? "default" : "outline"}
          onClick={() => setView("organizations")}
        >
          Organizations
        </Button>
      </div>

      {view === "users" ? <AdminUsersPanel /> : <AdminOrganizationsPanel />}
    </div>
  );
}