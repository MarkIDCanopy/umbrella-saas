// src/app/api/admin/auth/logout/route.ts
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, destroyAdminSession } from "@/lib/admin-auth";

export async function POST(req: Request) {
  await destroyAdminSession();

  const response = NextResponse.redirect(new URL("/admin/login", req.url));

  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return response;
}