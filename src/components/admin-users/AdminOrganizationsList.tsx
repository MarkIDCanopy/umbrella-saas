// src/components/admin-users/AdminOrganizationsList.tsx
"use client";

import type { AdminOrganizationListItem } from "./types";
import { AdminOrganizationsRow } from "./AdminOrganizationsRow";

export const ADMIN_ORGANIZATIONS_GRID =
  "minmax(260px,1.6fr) 90px 90px 180px 130px 24px";

export function AdminOrganizationsList({
  organizations,
  busyId,
  onTopUpCredits,
  onDeleteOrganization,
}: {
  organizations: AdminOrganizationListItem[];
  busyId: number | null;
  onTopUpCredits: (orgId: number, amount: number) => Promise<void>;
  onDeleteOrganization: (orgId: number) => Promise<void>;
}) {
  return (
    <div className="space-y-2 min-w-0">
      <AdminOrganizationsListHeader />

      {organizations.map((org) => (
        <AdminOrganizationsRow
          key={org.id}
          organization={org}
          busy={busyId === org.id}
          onTopUpCredits={onTopUpCredits}
          onDeleteOrganization={onDeleteOrganization}
        />
      ))}
    </div>
  );
}

function AdminOrganizationsListHeader() {
  return (
    <div
      className="hidden lg:grid items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground"
      style={{ gridTemplateColumns: ADMIN_ORGANIZATIONS_GRID }}
    >
      <div>Organization</div>
      <div>Credits</div>
      <div>Members</div>
      <div>Last transaction</div>
      <div>Status</div>
      <div />
    </div>
  );
}