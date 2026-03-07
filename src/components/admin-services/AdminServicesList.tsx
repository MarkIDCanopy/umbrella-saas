// src/components/admin-services/AdminServicesList.tsx
// src/components/admin-services/AdminServicesList.tsx
"use client";

import type { AdminServiceListItem } from "./types";
import { AdminServicesRow } from "./AdminServicesRow";

export const ADMIN_SERVICES_GRID =
  "minmax(260px,1.5fr) 180px 90px 120px 130px 110px 24px";

export function AdminServicesList({
  services,
  onRefresh,
}: {
  services: AdminServiceListItem[];
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <AdminServicesListHeader />

      {services.map((service) => (
        <AdminServicesRow
          key={service.id}
          service={service}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

function AdminServicesListHeader() {
  return (
    <div
      className="hidden items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground lg:grid"
      style={{ gridTemplateColumns: ADMIN_SERVICES_GRID }}
    >
      <div>Service</div>
      <div>Key</div>
      <div>Credits</div>
      <div>Country prices</div>
      <div>Operation prices</div>
      <div>Status</div>
      <div />
    </div>
  );
}