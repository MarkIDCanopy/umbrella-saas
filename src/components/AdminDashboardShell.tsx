// src/components/AdminDashboardShell.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  ChevronLeft,
  Home,
  Settings,
  Layers,
  LogOut,
  CheckCircle,
  Users,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type AdminUser = {
  id: number;
  email: string;
  fullName: string | null;
  adminRole: string | null;
};

export default function AdminDashboardShell({
  children,
  admin,
}: {
  children: React.ReactNode;
  admin: AdminUser;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pathname = usePathname();
  const router = useRouter();

  function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function truncateName(name: string, maxLength = 22) {
    if (!name) return "";
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength).trim() + "…";
  }

  function getInitials(name?: string | null) {
    if (!name) return "A";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getPageTitle(pathname: string): string {
    const parts = pathname.split("/").filter(Boolean);

    if (parts.length < 2) return "Dashboard";

    const section = parts[1];
    const sub = parts[2];

    const sectionTitles: Record<string, string> = {
      dashboard: "Overview",
      transactions: "Transactions",
      users: "Users",
      "admin-users": "Admin Users",
      services: "Services",
      settings: "Settings",
    };

    const sectionTitle = sectionTitles[section] || capitalize(section);

    if (sub) {
      return sub
        .split("-")
        .map(capitalize)
        .join(" ");
    }

    return sectionTitle;
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  const displayName = admin.fullName || admin.email || "Admin";
  const initials = getInitials(admin.fullName || admin.email);
  const roleLabel = admin.adminRole || "admin";

  const activeTitle = getPageTitle(pathname);

  const sidebarW = collapsed ? "md:pl-16" : "md:pl-60";
  const sidebarWidthClass = collapsed ? "w-16" : "w-60";

  return (
    <div className="relative h-screen overflow-hidden bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card transition-all duration-200 md:flex",
          sidebarWidthClass
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Umbrella Admin" className="h-8 w-8" />
              <span className="text-sm font-semibold tracking-tight">
                Umbrella Admin
              </span>
            </div>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="ml-auto"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <Menu className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2 pb-4 text-sm">
          <SidebarItem
            href="/admin/dashboard"
            label="Overview"
            icon={<Home className="h-5 w-5" />}
            active={pathname === "/admin/dashboard"}
            collapsed={collapsed}
          />
          <SidebarItem
            href="/admin/transactions"
            label="Transactions"
            icon={<CheckCircle className="h-5 w-5" />}
            active={pathname.startsWith("/admin/transactions")}
            collapsed={collapsed}
          />
          <SidebarItem
            href="/admin/users"
            label="Users"
            icon={<Users className="h-5 w-5" />}
            active={pathname.startsWith("/admin/users")}
            collapsed={collapsed}
          />
          <SidebarItem
            href="/admin/admin-users"
            label="Admin Users"
            icon={<Shield className="h-5 w-5" />}
            active={pathname.startsWith("/admin/admin-users")}
            collapsed={collapsed}
          />
          <SidebarItem
            href="/admin/services"
            label="Services"
            icon={<Layers className="h-5 w-5" />}
            active={pathname.startsWith("/admin/services")}
            collapsed={collapsed}
          />
          <SidebarItem
            href="/admin/settings"
            label="Settings"
            icon={<Settings className="h-5 w-5" />}
            active={pathname.startsWith("/admin/settings")}
            collapsed={collapsed}
          />
        </nav>
      </aside>

      <div className={cn("flex h-full min-w-0 flex-col", sidebarW)}>
        <header className="flex items-center justify-between border-b border-border bg-card px-3 py-2 sm:px-6 sm:py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 md:hidden">
              <img src="/logo.svg" alt="Umbrella Admin" className="h-6 w-6" />
              <span className="text-sm font-semibold tracking-tight">
                Umbrella Admin
              </span>
            </div>

            <div className="hidden md:flex flex-col">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Admin Console
              </span>
              <span className="text-sm font-semibold">{activeTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              {!mounted ? (
                <div className="flex items-center gap-3 rounded-md px-2 py-1">
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {roleLabel}
                  </span>

                  <span
                    className="max-w-[160px] truncate text-sm font-medium"
                    title={displayName}
                  >
                    {truncateName(displayName)}
                  </span>

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                    {initials}
                  </div>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1 hover:bg-accent"
                    >
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {roleLabel}
                      </span>

                      <span
                        className="max-w-[160px] truncate text-sm font-medium"
                        title={displayName}
                      >
                        {truncateName(displayName)}
                      </span>

                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                        {initials}
                      </div>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="px-2 py-1">
                      <div className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap font-medium">
                        {displayName}
                      </div>
                      <div className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
                        {admin.email}
                      </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 focus:text-red-700"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="md:hidden">
              {!mounted ? (
                <Button size="icon" variant="ghost" aria-label="Open menu" disabled>
                  <Menu className="h-5 w-5" />
                </Button>
              ) : (
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label="Open menu">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>

                  <SheetContent side="left" className="flex flex-col p-0">
                    <SheetHeader className="border-b px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src="/logo.svg" alt="Umbrella Admin" className="h-7 w-7" />
                        <div className="flex flex-col">
                          <SheetTitle className="text-sm font-semibold">
                            Umbrella Admin
                          </SheetTitle>
                          <span className="text-[11px] text-muted-foreground">
                            {activeTitle}
                          </span>
                        </div>
                      </div>
                    </SheetHeader>

                    <nav className="mt-2 flex flex-col gap-1 px-2 text-sm">
                      <SidebarItem
                        href="/admin/dashboard"
                        label="Overview"
                        icon={<Home className="h-5 w-5" />}
                        active={pathname === "/admin/dashboard"}
                        collapsed={false}
                        onClick={() => setMobileOpen(false)}
                      />
                      <SidebarItem
                        href="/admin/transactions"
                        label="Transactions"
                        icon={<CheckCircle className="h-5 w-5" />}
                        active={pathname.startsWith("/admin/transactions")}
                        collapsed={false}
                        onClick={() => setMobileOpen(false)}
                      />
                      <SidebarItem
                        href="/admin/users"
                        label="Users"
                        icon={<Users className="h-5 w-5" />}
                        active={pathname.startsWith("/admin/users")}
                        collapsed={false}
                        onClick={() => setMobileOpen(false)}
                      />
                      <SidebarItem
                        href="/admin/admin-users"
                        label="Admin Users"
                        icon={<Shield className="h-5 w-5" />}
                        active={pathname.startsWith("/admin/admin-users")}
                        collapsed={false}
                        onClick={() => setMobileOpen(false)}
                      />
                      <SidebarItem
                        href="/admin/services"
                        label="Services"
                        icon={<Layers className="h-5 w-5" />}
                        active={pathname.startsWith("/admin/services")}
                        collapsed={false}
                        onClick={() => setMobileOpen(false)}
                      />
                      <SidebarItem
                        href="/admin/settings"
                        label="Settings"
                        icon={<Settings className="h-5 w-5" />}
                        active={pathname.startsWith("/admin/settings")}
                        collapsed={false}
                        onClick={() => setMobileOpen(false)}
                      />
                    </nav>

                    <div className="mt-auto space-y-3 border-t px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                          {initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="max-w-[180px] truncate text-sm font-medium">
                            {displayName}
                          </span>
                          <span className="max-w-[180px] truncate text-xs text-muted-foreground">
                            {admin.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                          {roleLabel}
                        </span>

                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={handleLogout}
                        >
                          <LogOut className="mr-1.5 h-4 w-4" />
                          Log out
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarItem({
  href,
  label,
  icon,
  collapsed,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  collapsed: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        router.push(href);
        await new Promise((r) => setTimeout(r, 80));
        onClick?.();
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        collapsed && "justify-center",
        active && "bg-accent font-medium text-accent-foreground"
      )}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  );
}