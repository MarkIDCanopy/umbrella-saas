export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/emails/mailer";

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

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, fullName: true, emailVerifiedAt: true },
    });

    // Don’t leak existence too much; but for UX we’ll still be clear
    if (!user) {
      return NextResponse.json(
        { error: "No account found for this email." },
        { status: 404 }
      );
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json(
        { message: "Email already verified.", emailSent: false },
        { status: 200 }
      );
    }

    // Optional cleanup: remove old unused tokens for this user
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    await prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}`;

    let emailSent = true;
    try {
      await sendVerificationEmail({
        to: user.email,
        fullName: user.fullName,
        verifyUrl,
      });
    } catch (e) {
      emailSent = false;
      console.error("RESEND VERIFY EMAIL FAILED", e);
    }

    return NextResponse.json(
      {
        message: emailSent
          ? "Verification email sent."
          : "We couldn’t send the verification email. Please try again later or contact support.",
        emailSent,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("RESEND VERIFICATION ERROR", err);
    return NextResponse.json(
      { error: "Could not resend verification email." },
      { status: 500 }
    );
  }
}
