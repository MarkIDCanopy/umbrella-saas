// src/app/api/organizations/select/route.ts
import { NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await req.json();

  // Check membership + active status
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.userId,
      organizationId: Number(orgId),
      status: "active",
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Update active org on session
  await updateSession(session.sessionId, { activeOrgId: Number(orgId) });

  return NextResponse.json({ success: true });
}
