// src/lib/billing/context.ts
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export type BillingContext =
  | { kind: "personal"; userId: number }
  | { kind: "org"; organizationId: number; userId: number };

export async function getBillingContext(): Promise<BillingContext | null> {
  const session = await getSession();
  if (!session) return null;

  const userId = session.userId;

  // ✅ Workspace switcher drives billing: org only if activeOrgId is set
  const activeOrgId = session.activeOrgId ? Number(session.activeOrgId) : null;

  if (!activeOrgId) {
    return { kind: "personal", userId };
  }

  // ✅ Safety: ensure user is an ACTIVE member of the active org
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId: activeOrgId,
      status: "active",
    },
    select: { id: true },
  });

  // If session points to an org user is no longer in -> fall back to personal
  if (!membership) {
    return { kind: "personal", userId };
  }

  return { kind: "org", organizationId: activeOrgId, userId };
}
