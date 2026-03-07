// src/components/admin-settings/AdminSettingsOverview.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Settings2,
  Moon,
  SunMedium,
  Shield,
  UserCog,
  Database,
  ArrowRight,
} from "lucide-react";

type AdminSettingsOverviewProps = {
  admin: {
    id: number;
    email: string;
    fullName: string | null;
    adminRole: string | null;
  };
};

export function AdminSettingsOverview({
  admin,
}: AdminSettingsOverviewProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const displayName = admin.fullName || admin.email;
  const roleLabel = admin.adminRole || "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-full bg-muted p-2">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Internal admin console preferences and access overview.
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>
                  Choose how the internal console looks for you.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                >
                  <SunMedium className="h-4 w-4" />
                  Light
                </Button>

                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admin account</CardTitle>
                <CardDescription>
                  Your internal access profile for the admin console.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <InfoRow label="Name" value={displayName} />
                <InfoRow label="Email" value={admin.email} />
                <InfoRow label="Role" value={roleLabel} />
                <InfoRow label="Admin ID" value={String(admin.id)} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Security</CardTitle>
                </div>
                <CardDescription>
                  Internal access should stay separate from public SaaS usage.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Use admin login only for operational work.</p>
                <p>Do not share internal credentials across teams.</p>
                <p>Password resets and access changes should be controlled internally.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Operational scope</CardTitle>
                </div>
                <CardDescription>
                  Typical tasks available from the internal console.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Inspect transactions across users and organizations.</p>
                <p>Review user accounts, balances, and activity.</p>
                <p>Maintain service catalog and admin access.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Environment</CardTitle>
                </div>
                <CardDescription>
                  Current console context and intended usage.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <InfoRow label="Console" value="Internal admin" />
                <InfoRow label="Audience" value="ID Canopy back office / ops" />
                <InfoRow label="Access model" value="Separate admin auth session" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick access</CardTitle>
              <CardDescription>
                Jump to the main internal operational areas.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/admin/dashboard">
                  Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline">
                <Link href="/admin/transactions">
                  Transactions
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline">
                <Link href="/admin/users">
                  Users
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline">
                <Link href="/admin/services">
                  Services
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline">
                <Link href="/admin/admin-users">
                  Admin users
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-right text-sm font-medium text-foreground break-all">
        {value}
      </div>
    </div>
  );
}