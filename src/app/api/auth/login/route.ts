// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { resolveLastActiveOrgId } from "@/lib/session";

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
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        fullName: true,
        twofaEnabled: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }
    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Please verify your email to activate your account." },
        { status: 403 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // ✅ Restore last workspace (org) if still valid, otherwise personal (null)
    const sessionToken = crypto.randomBytes(32).toString("hex");

    // ✅ Load lastActiveOrgId and validate membership
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { lastActiveOrgId: true },
    });

    let activeOrgId: number | null = dbUser?.lastActiveOrgId ?? null;

    if (activeOrgId) {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          organizationId: activeOrgId,
          userId: user.id,
          status: "active",
        },
        select: { id: true },
      });

      if (!membership) activeOrgId = null;
    }

    await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken,
        activeOrgId, // ✅ here
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          twofa_enabled: user.twofaEnabled,
        },
        message: "Login successful",
      },
      { status: 200 }
    );

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected error occurred during login." },
      { status: 500 }
    );
  }
}