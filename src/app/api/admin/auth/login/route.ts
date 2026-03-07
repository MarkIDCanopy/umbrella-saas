// src/app/api/admin/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, createAdminSession } from "@/lib/admin-auth";

function isBlocked(user: {
  isBlocked: boolean;
  blockedUntil: Date | null;
  deletedAt: Date | null;
}) {
  if (user.deletedAt) return true;
  if (!user.isBlocked) return false;
  if (!user.blockedUntil) return true;
  return user.blockedUntil > new Date();
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        fullName: true,
        isAdmin: true,
        adminRole: true,
        emailVerifiedAt: true,
        isBlocked: true,
        blockedUntil: true,
        deletedAt: true,
      },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Invalid admin credentials." },
        { status: 401 }
      );
    }

    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Admin email is not verified." },
        { status: 403 }
      );
    }

    if (isBlocked(user)) {
      return NextResponse.json(
        { error: "This account is blocked." },
        { status: 403 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return NextResponse.json(
        { error: "Invalid admin credentials." },
        { status: 401 }
      );
    }

    const { rawToken, expiresAt } = await createAdminSession(user.id);

    const response = NextResponse.json(
      {
        admin: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          adminRole: user.adminRole,
        },
        message: "Admin login successful",
      },
      { status: 200 }
    );

    response.cookies.set(ADMIN_COOKIE, rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (err) {
    console.error("ADMIN LOGIN ERROR", err);
    return NextResponse.json(
      { error: "Unexpected error occurred during admin login." },
      { status: 500 }
    );
  }
}