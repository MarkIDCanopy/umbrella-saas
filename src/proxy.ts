// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "idc_admin_session";

function stripPort(host: string) {
  return host.split(":")[0].toLowerCase();
}

function isAdminHost(host: string) {
  const current = stripPort(host);
  const configured = process.env.ADMIN_HOST
    ? stripPort(process.env.ADMIN_HOST)
    : null;

  if (configured) return current === configured;

  // dev fallback
  return current === "admin.localhost";
}

function isStaticOrPublic(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/public") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

function isAdminArea(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin/")
  );
}

function isAdminPublicRoute(pathname: string) {
  return (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/admin/auth/")
  );
}

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const host = req.headers.get("host") || "";
  const onAdminHost = isAdminHost(host);
  const adminCookie = req.cookies.get(ADMIN_COOKIE)?.value;

  // Production: admin routes must not be reachable from public host
  if (
    process.env.NODE_ENV === "production" &&
    isAdminArea(pathname) &&
    !onAdminHost
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // On admin host, only admin area should be usable
  if (onAdminHost && !isStaticOrPublic(pathname)) {
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }

    if (!isAdminArea(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Protect admin pages + admin API
  if (isAdminArea(pathname) && !isAdminPublicRoute(pathname)) {
    if (!adminCookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};