// src/app/api/admin/admin-users/[userId]/reset-password/route.ts
import { NextResponse } from "next/server";
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

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const numericUserId = Number(userId);

    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: numericUserId },
      select: {
        id: true,
        email: true,
        fullName: true,
        isAdmin: true,
      },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin console user not found." },
        { status: 404 }
      );
    }

    await createAndSendAdminResetEmail({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ADMIN RESET EMAIL ERROR", err);
    return NextResponse.json(
      { error: "Could not send reset email." },
      { status: 500 }
    );
  }
}