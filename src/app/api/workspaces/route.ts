import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // All active org memberships for the user
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.userId, status: "active" },
    select: {
      role: true,
      organization: { select: { id: true, name: true } },
    },
    orderBy: { organization: { name: "asc" } },
  });

  const workspaces = [
    { kind: "personal" as const, id: "personal", name: "Personal" },
    ...memberships.map((m) => ({
      kind: "org" as const,
      id: m.organization.id,
      name: m.organization.name,
      role: m.role,
    })),
  ];

  const activeWorkspace =
    session.activeOrgId == null
      ? { kind: "personal" as const, id: "personal" }
      : { kind: "org" as const, id: session.activeOrgId };

  return NextResponse.json({
    activeWorkspace,
    workspaces,
  });
}
