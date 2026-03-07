// src/app/api/auth/verify-email/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const tokenHash = sha256(token);

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  if (record.usedAt) {
    return NextResponse.json({ error: "Token already used" }, { status: 400 });
  }

  if (record.expiresAt <= new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
