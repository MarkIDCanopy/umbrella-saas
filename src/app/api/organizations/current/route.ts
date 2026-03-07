// src/app/api/organizations/current/route.ts
import { NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { organization: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const activeOrgId = session.activeOrgId;

  // ✅ If user is in "personal workspace", activeOrgId is null
  if (!activeOrgId) {
    return NextResponse.json(
      { organization: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const orgId = Number(activeOrgId);
  if (!Number.isFinite(orgId)) {
    // bad cookie/session state -> reset
    await updateSession(session.sessionId, { activeOrgId: null });
    return NextResponse.json(
      { organization: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    // ✅ Permission guard: user must be an ACTIVE member of this org
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: session.userId,
        status: "active",
      },
      select: { id: true },
    });

    // If user got removed / membership inactive -> reset session to personal
    if (!membership) {
      await updateSession(session.sessionId, { activeOrgId: null });
      return NextResponse.json(
        { organization: null },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        orgUid: true,
        name: true,
        teamEnabled: true,
        createdBy: true,
        createdAt: true,
      },
    });

    if (!org) {
      // org deleted -> reset session
      await updateSession(session.sessionId, { activeOrgId: null });
      return NextResponse.json(
        { organization: null },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
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

    return NextResponse.json(
      {
        organization: {
          ...org,
          members,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("ORG CURRENT ERROR:", error);
    return NextResponse.json(
      { organization: null },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}