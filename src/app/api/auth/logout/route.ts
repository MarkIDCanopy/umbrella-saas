// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (sessionToken) {
    await prisma.session.deleteMany({
      where: { sessionToken },
    });
  }

  const res = NextResponse.json({ success: true });

  res.cookies.set("session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return res;
}
