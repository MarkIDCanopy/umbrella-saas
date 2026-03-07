// src/app/api/auth/forgot-password/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/emails/mailer";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const { email } = (await req.json().catch(() => ({}))) as { email?: string };

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    // ✅ Always return generic success (prevents account enumeration)
    const genericResponse = NextResponse.json(
      {
        message:
          "If an account exists for this email, we sent a password reset link.",
        emailSent: true,
      },
      { status: 200 }
    );

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, fullName: true, emailVerifiedAt: true },
    });

    if (!user) return genericResponse;

    // Optional: require verified email to reset password
    // if (!user.emailVerifiedAt) return genericResponse;

    // delete old unused tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    // create new reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      user.email
    )}`;

    // ✅ Do NOT fail if email sending fails
    try {
      await sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName,
        resetUrl,
      });
    } catch (e) {
      console.error("RESET EMAIL SEND FAILED", e);
      console.log("Reset URL (dev):", resetUrl);
    }

    return genericResponse;
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR", err);
    return NextResponse.json(
      { error: "Could not process request." },
      { status: 500 }
    );
  }
}
