// src/lib/session.ts
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) return null;

  const session = await prisma.session.findFirst({
    where: {
      sessionToken,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      userId: true,
      activeOrgId: true,
    },
  });

  if (!session) return null;

  return {
    sessionId: session.id,
    userId: session.userId,
    activeOrgId: session.activeOrgId,
  };
}

export async function updateSession(
  sessionId: number,
  updates: { activeOrgId?: number | null }
) {
  const data: any = {};

  if (updates.activeOrgId !== undefined) {
    data.activeOrgId = updates.activeOrgId;
  }

  if (Object.keys(data).length === 0) return;

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

// ✅ NEW: restore last org workspace that is still valid for the user
export async function resolveLastActiveOrgId(userId: number): Promise<number | null> {
  // find most recently updated session that had an org selected
  const last = await prisma.session.findFirst({
    where: { userId, activeOrgId: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: { activeOrgId: true },
  });

  const orgId = last?.activeOrgId ?? null;
  if (!orgId) return null;

  // verify the user is still an ACTIVE member of that org
  const membership = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId,
      status: "active",
    },
    select: { id: true },
  });

  return membership ? orgId : null;
}