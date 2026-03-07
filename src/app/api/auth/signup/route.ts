// src/app/api/auth/signup/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/emails/mailer";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, fullName } = body as {
      email?: string;
      password?: string;
      fullName?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: fullName ?? null,
        emailVerifiedAt: null,
      },
      select: { id: true, email: true, fullName: true },
    });

    // create verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    await prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}`;

    // ✅ Do NOT fail signup if email sending fails
    let emailSent = true;
    try {
      await sendVerificationEmail({
        to: user.email,
        fullName: user.fullName,
        verifyUrl,
      });
    } catch (e) {
      emailSent = false;
      console.error("VERIFY EMAIL SEND FAILED", e);
      console.log("Verify URL (dev):", verifyUrl);
    }

    return NextResponse.json(
      {
        message: emailSent
          ? "Account created. Check your inbox to verify your email."
          : "Account created, but we couldn’t send the verification email. Please click resend or contact support.",
        emailSent,
        redirectTo: `/verify-email?email=${encodeURIComponent(user.email)}&emailSent=${
          emailSent ? "1" : "0"
        }`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("SIGNUP ERROR", err);
    return NextResponse.json(
      { error: "Could not create account." },
      { status: 500 }
    );
  }
}
