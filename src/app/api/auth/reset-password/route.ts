// src/app/api/auth/reset-password/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const { token, newPassword } = (await req.json().catch(() => ({}))) as {
      token?: string;
      newPassword?: string;
    };

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token and newPassword are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const tokenHash = sha256(token);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.session.deleteMany({ where: { userId: record.userId } }),
      prisma.adminSession.deleteMany({ where: { userId: record.userId } }),
    ]);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("RESET PASSWORD ERROR", err);
    return NextResponse.json(
      { error: "Could not reset password." },
      { status: 500 }
    );
  }
}
