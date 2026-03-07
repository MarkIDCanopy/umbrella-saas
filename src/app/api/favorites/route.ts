import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ favorites: [] }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const where = session.activeOrgId
    ? { organizationId: session.activeOrgId }
    : { userId: session.userId };

  const rows = await prisma.favoriteService.findMany({
    where,
    select: { serviceId: true },
  });

  return NextResponse.json(
    { favorites: rows.map((r: { serviceId: string }) => r.serviceId) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
