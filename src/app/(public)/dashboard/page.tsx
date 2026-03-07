// src/app/(public)/dashboard/page.tsx
import { DashboardOverviewClient } from "@/components/dashboard/DashboardOverviewClient";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardOverviewClient />
    </div>
  );
}
