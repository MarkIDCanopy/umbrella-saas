// src/lib/admin-auth.ts
import "server-only";

import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const ADMIN_COOKIE = "idc_admin_session";
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

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

export async function createAdminSession(userId: number) {
  const rawToken = randomBytes(32).toString("hex");
  const sessionTokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);

  await prisma.adminSession.create({
    data: {
      userId,
      sessionTokenHash,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_COOKIE)?.value;

  if (rawToken) {
    await prisma.adminSession.deleteMany({
      where: {
        sessionTokenHash: sha256(rawToken),
      },
    });
  }
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_COOKIE)?.value;

  if (!rawToken) return null;

  const session = await prisma.adminSession.findFirst({
    where: {
      sessionTokenHash: sha256(rawToken),
      expiresAt: { gt: new Date() },
    },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          isAdmin: true,
          adminRole: true,
          isBlocked: true,
          blockedUntil: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!session?.user) return null;
  if (!session.user.isAdmin) return null;
  if (isBlocked(session.user)) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    fullName: session.user.fullName,
    adminRole: session.user.adminRole,
  };
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }
  return admin;
}