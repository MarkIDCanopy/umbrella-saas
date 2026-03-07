// src/app/api/organizations/create/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/UserAuth";
import { getSession, updateSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function generateOrgUID() {
  return "org_" + Math.random().toString(36).substring(2, 12);
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Organization name is too short." },
        { status: 400 }
      );
    }

    const orgUID = generateOrgUID();

    // 1) Create organization
    const org = await prisma.organization.create({
      data: {
        name,
        orgUid: orgUID,
        createdBy: user.id,
        teamEnabled: false,
      },
      select: {
        id: true,
        name: true,
        orgUid: true,
        teamEnabled: true,
        createdAt: true,
      },
    });

    // 2) Add creator as OWNER
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        email: user.email,
        name: user.full_name, // <- change from user.fullName
        role: "owner",
        status: "active",
        invitedBy: user.id,
        joinedAt: new Date(),
      },
    });

    // 3) Set active organization in session
    const session = await getSession();
    if (session) {
      await updateSession(session.sessionId, { activeOrgId: org.id });
    }

    // 4) Return response
    return NextResponse.json({
      organization: {
        ...org,
        members: [
          {
            id: user.id,
            user_id: user.id,
            email: user.email,
            name: user.full_name, // <- change from user.fullName
            role: "owner",
            status: "active",
          },
        ],
      },
    });
  } catch (error) {
    console.error("Create organization error:", error);
    return NextResponse.json(
      { error: "Unexpected error creating organization." },
      { status: 500 }
    );
  }
}
