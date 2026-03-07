// src/components/DashboardShell.tsx
"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  ChevronLeft,
  Home,
  Settings,
  Layers,
  Star,
  LogOut,
  CreditCard,
  CheckCircle,
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
import { useUser } from "@/context/UserContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, credits, creditsLoading } = useUser();

  function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  function truncateName(name: string, maxLength = 22) {
    if (!name) return "";
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength).trim() + "…";
  }
  function getInitials(name?: string | null) {
    if (!name) return "U";
    const parts = name.trim().split(" ");
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
      services: "Services",
      "my-services": "My Services",
      transactions: "Transactions",
      billing: "Billing",
      settings: "Settings",
    };

    const sectionTitle = sectionTitles[section] || capitalize(section);
    if (sub) {
      return sub.split("-").map(capitalize).join(" ");
    }
    return sectionTitle;
  }

  const activeTitle = getPageTitle(pathname);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const displayName = user?.full_name || user?.email || "User";
  const initials = getInitials(user?.full_name || user?.email);
  const creditsLabel =
    creditsLoading || credits === null ? "…" : `${credits.toLocaleString()} credits`;

  const sidebarW = collapsed ? "md:pl-16" : "md:pl-60";
  const sidebarWidthClass = collapsed ? "w-16" : "w-60";

  return (
    // ✅ important: keep scrolling INSIDE main, not on the page
    <div className="relative h-screen bg-background text-foreground overflow-hidden">
      {/* DESKTOP SIDEBAR (fixed) */}
      <aside
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-border bg-card transition-all duration-200",
          sidebarWidthClass
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Umbrella SaaS" className="h-8 w-8" />
              <span className="text-sm font-semibold tracking-tight">
                Umbrella SaaS
              </span>
            </div>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="ml-auto"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* NAV */}
        <nav className="flex flex-1 flex-col gap-1 px-2 text-sm pb-4">
          <SidebarItem
            href="/dashboard"
            label="Overview"
            icon={<Home className="h-5 w-5" />}
            active={pathname === "/dashboard"}
            collapsed={collapsed}
          />
          <SidebarItem
            href="/dashboard/services"
            label="Services"
            icon={<Layers className="h-5 w-5" />}
            active={pathname.startsWith("/dashboard/services")}
            collapsed={collapsed}
          />
          <SidebarItem
            href="/dashboard/my-services"
            label="My Services"
            icon={<Star className="h-5 w-5" />}
            active={pathname.startsWith("/dashboard/my-services")}
            collapsed={collapsed}
          />
          <SidebarItem
            href="/dashboard/transactions"
            label="Transactions"
            icon={<CheckCircle className="h-5 w-5" />}
            active={pathname.startsWith("/dashboard/transactions")}
            collapsed={collapsed}
          />
          <SidebarItem
            href="/dashboard/billing"
            label="Billing"
            icon={<CreditCard className="h-5 w-5" />}
            active={pathname.startsWith("/dashboard/billing")}
            collapsed={collapsed}
          />
          <SidebarItem
            href="/dashboard/settings"
            label="Settings"
            icon={<Settings className="h-5 w-5" />}
            active={pathname.startsWith("/dashboard/settings")}
            collapsed={collapsed}
          />
        </nav>
      </aside>

      {/* CONTENT WRAPPER (offset for fixed sidebar) */}
      <div className={cn("flex h-full flex-col min-w-0", sidebarW)}>
        {/* TOP BAR */}
        <header className="flex items-center justify-between border-b border-border bg-card px-3 py-2 sm:px-6 sm:py-3">
          <div className="flex items-center gap-3">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 md:hidden">
              <img src="/logo.svg" alt="Umbrella SaaS" className="h-6 w-6" />
              <span className="text-sm font-semibold tracking-tight">
                Umbrella SaaS
              </span>
            </div>

            <div className="hidden md:flex flex-col">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Dashboard
              </span>
              <span className="text-sm font-semibold">{activeTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop user dropdown */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-3 cursor-pointer px-2 py-1 rounded-md hover:bg-accent"
                  >
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {creditsLabel}
                    </span>

                    <span className="text-sm font-medium max-w-[160px] truncate" title={displayName}>
                      {truncateName(displayName)}
                    </span>

                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {initials}
                    </div>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="px-2 py-1">
                    <div className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap font-medium">
                      {displayName}
                    </div>
                    <div className="text-xs text-muted-foreground max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {user?.email}
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
            </div>

            {/* Mobile: hamburger → sheet */}
            <div className="md:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

                <SheetContent side="left" className="flex flex-col p-0">
                  <SheetHeader className="border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src="/logo.svg" alt="Umbrella SaaS" className="h-7 w-7" />
                      <div className="flex flex-col">
                        <SheetTitle className="text-sm font-semibold">
                          Umbrella SaaS
                        </SheetTitle>
                        <span className="text-[11px] text-muted-foreground">
                          {activeTitle}
                        </span>
                      </div>
                    </div>
                  </SheetHeader>

                  <nav className="mt-2 flex flex-col gap-1 px-2 text-sm">
                    <SidebarItem
                      href="/dashboard"
                      label="Overview"
                      icon={<Home className="h-5 w-5" />}
                      active={pathname === "/dashboard"}
                      collapsed={false}
                      onClick={() => setMobileOpen(false)}
                    />
                    <SidebarItem
                      href="/dashboard/services"
                      label="Services"
                      icon={<Layers className="h-5 w-5" />}
                      active={pathname.startsWith("/dashboard/services")}
                      collapsed={false}
                      onClick={() => setMobileOpen(false)}
                    />
                    <SidebarItem
                      href="/dashboard/my-services"
                      label="My Services"
                      icon={<Star className="h-5 w-5" />}
                      active={pathname.startsWith("/dashboard/my-services")}
                      collapsed={false}
                      onClick={() => setMobileOpen(false)}
                    />
                    <SidebarItem
                      href="/dashboard/transactions"
                      label="Transactions"
                      icon={<CheckCircle className="h-5 w-5" />}
                      active={pathname.startsWith("/dashboard/transactions")}
                      collapsed={false}
                      onClick={() => setMobileOpen(false)}
                    />
                    <SidebarItem
                      href="/dashboard/billing"
                      label="Billing"
                      icon={<CreditCard className="h-5 w-5" />}
                      active={pathname.startsWith("/dashboard/billing")}
                      collapsed={false}
                      onClick={() => setMobileOpen(false)}
                    />
                    <SidebarItem
                      href="/dashboard/settings"
                      label="Settings"
                      icon={<Settings className="h-5 w-5" />}
                      active={pathname.startsWith("/dashboard/settings")}
                      collapsed={false}
                      onClick={() => setMobileOpen(false)}
                    />
                  </nav>

                  <div className="mt-auto border-t px-4 py-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                        {initials}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium max-w-[180px] truncate">
                          {displayName}
                        </span>
                        <span className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {user?.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {creditsLabel}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-1.5 h-4 w-4" />
                        Log out
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* ✅ The ONLY scroll container */}
        <main className="flex-1 min-w-0 px-3 py-4 sm:px-6 sm:py-6 overflow-y-auto overflow-x-hidden">
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
        "flex w-full text-left items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
        collapsed && "justify-center",
        active && "bg-accent text-accent-foreground font-medium"
      )}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
