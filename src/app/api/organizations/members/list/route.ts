// src/app/api/organizations/members/list/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();

  if (!session?.activeOrgId) {
    return NextResponse.json({ members: [] });
  }

  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: Number(session.activeOrgId),
    },
    select: {
      id: true,
      userId: true,
      email: true,
      name: true,
      role: true,
      status: true,
    },
    orderBy: { invitedAt: "asc" },
  });

  return NextResponse.json({ members });
}
