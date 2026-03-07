// src/components/admin-users/AdminUsersList.tsx
"use client";

import type { AdminUserListItem } from "./types";
import { AdminUsersRow } from "./AdminUsersRow";

export const ADMIN_USERS_GRID =
  "minmax(260px,1.6fr) 90px 90px 180px 130px 24px";

export function AdminUsersList({
  users,
  busyId,
  onTopUpCredits,
  onBlockUser,
  onUnblockUser,
  onDeleteUser,
}: {
  users: AdminUserListItem[];
  busyId: number | null;
  onTopUpCredits: (userId: number, amount: number) => Promise<void>;
  onBlockUser: (
    userId: number,
    mode: "temporary" | "permanent",
    days?: number
  ) => Promise<void>;
  onUnblockUser: (userId: number) => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
}) {
  return (
    <div className="space-y-2 min-w-0">
      <AdminUsersListHeader />

      {users.map((user) => (
        <AdminUsersRow
          key={user.id}
          user={user}
          busy={busyId === user.id}
          onTopUpCredits={onTopUpCredits}
          onBlockUser={onBlockUser}
          onUnblockUser={onUnblockUser}
          onDeleteUser={onDeleteUser}
        />
      ))}
    </div>
  );
}

function AdminUsersListHeader() {
  return (
    <div
      className="hidden lg:grid items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground"
      style={{ gridTemplateColumns: ADMIN_USERS_GRID }}
    >
      <div>User</div>
      <div>Credits</div>
      <div>Orgs</div>
      <div>Last transaction</div>
      <div>Status</div>
      <div />
    </div>
  );
}