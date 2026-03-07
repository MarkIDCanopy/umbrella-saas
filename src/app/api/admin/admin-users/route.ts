// src/app/api/admin/admin-users/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { sendAdminPasswordResetEmail } from "@/lib/emails/admin/password-reset-email";

export const runtime = "nodejs";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function createAndSendAdminResetEmail(params: {
  userId: number;
  email: string;
  fullName?: string | null;
}) {
  const { userId, email, fullName } = params;

  await prisma.passwordResetToken.deleteMany({
    where: { userId, usedAt: null },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(
    email
  )}`;

  await sendAdminPasswordResetEmail({
    to: email,
    fullName: fullName ?? null,
    resetUrl,
  });
}

export async function GET() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      isAdmin: true,
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      fullName: true,
      createdAt: true,
      updatedAt: true,
      emailVerifiedAt: true,
      isBlocked: true,
      blockedUntil: true,
      blockedReason: true,
      adminRole: true,
    },
  });

  return NextResponse.json({ results: users });
}

export async function POST(req: Request) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      fullName?: string;
    };

    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim() || null;

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        emailVerifiedAt: true,
        isAdmin: true,
      },
    });

    if (!user) {
      const tempPasswordHash = await bcrypt.hash(
        crypto.randomBytes(24).toString("hex"),
        12
      );

      user = await prisma.user.create({
        data: {
          email,
          fullName,
          passwordHash: tempPasswordHash,
          emailVerifiedAt: new Date(),
          isAdmin: true,
          adminRole: "admin",
          isBlocked: false,
          blockedAt: null,
          blockedUntil: null,
          blockedReason: null,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          emailVerifiedAt: true,
          isAdmin: true,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          fullName: fullName ?? user.fullName,
          isAdmin: true,
          adminRole: "admin",
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          isBlocked: false,
          blockedAt: null,
          blockedUntil: null,
          blockedReason: null,
        },
      });

      user = {
        ...user,
        fullName: fullName ?? user.fullName,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        isAdmin: true,
      };
    }

    await createAndSendAdminResetEmail({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ADMIN USER CREATE ERROR", err);
    return NextResponse.json(
      { error: "Could not add admin console user." },
      { status: 500 }
    );
  }
}