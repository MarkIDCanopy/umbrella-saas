// src/app/admin/login/page.tsx
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import AdminLoginForm from "./AdminLoginForm";

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/admin/dashboard");
  }

  return <AdminLoginForm />;
}