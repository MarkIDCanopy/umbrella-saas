// src/app/admin/(protected)/layout.tsx
import { requireAdmin } from "@/lib/admin-auth";
import AdminDashboardShell from "@/components/AdminDashboardShell";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return <AdminDashboardShell admin={admin}>{children}</AdminDashboardShell>;
}