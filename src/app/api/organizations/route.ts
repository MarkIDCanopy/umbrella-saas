// src/app/api/organizations/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/UserAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all org memberships where the user is active
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId: user.id,
        status: "active",
      },
      select: {
        role: true,
        status: true,
        organization: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        organization: { createdAt: "asc" },
      },
    });

    // Flatten response to match old SQL output
    const organizations = memberships.map((m: typeof memberships[number]) => ({
      id: m.organization.id,
      name: m.organization.name,
      role: m.role,
      status: m.status,
    }));

    return NextResponse.json({ organizations });
  } catch (err) {
    console.error("List organizations failed:", err);
    return NextResponse.json(
      { error: "Unexpected error listing organizations." },
      { status: 500 }
    );
  }
}
