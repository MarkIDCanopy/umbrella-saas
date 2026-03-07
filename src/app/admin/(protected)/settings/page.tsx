// src/app/admin/(protected)/settings/page.tsx
import { requireAdmin } from "@/lib/admin-auth";
import { AdminSettingsOverview } from "@/components/admin-settings/AdminSettingsOverview";

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();

  return (
    <AdminSettingsOverview
      admin={{
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        adminRole: admin.adminRole,
      }}
    />
  );
}