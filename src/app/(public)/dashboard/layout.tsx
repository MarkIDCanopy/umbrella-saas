// src/app/(public)/dashboard/layout.tsx
import RequireAuth from "@/components/RequireAuth";
import DashboardShell from "@/components/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <DashboardShell>{children}</DashboardShell>
    </RequireAuth>
  );
}
