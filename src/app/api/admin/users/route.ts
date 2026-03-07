// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const query = searchParams.get("query")?.trim() || "";
  const status = searchParams.get("status") || "all";

  const and: any[] = [];

  if (query) {
    and.push({
      OR: [
        { email: { contains: query, mode: "insensitive" } },
        { fullName: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  if (status === "active") {
    and.push({
      OR: [
        { isBlocked: false },
        { blockedUntil: { lte: new Date() } },
      ],
    });
  }

  if (status === "blocked") {
    and.push({
      isBlocked: true,
      OR: [{ blockedUntil: null }, { blockedUntil: { gt: new Date() } }],
    });
  }

  if (status === "admins") {
    and.push({
      isAdmin: true,
    });
  }

  const where = and.length ? { AND: and } : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ isAdmin: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      fullName: true,
      country: true,
      createdAt: true,
      emailVerifiedAt: true,
      isAdmin: true,
      adminRole: true,
      isBlocked: true,
      blockedAt: true,
      blockedUntil: true,
      blockedReason: true,
      deletedAt: true,

      creditWallet: {
        select: {
          id: true,
          balance: true,
          billingProfile: {
            select: {
              billingType: true,
              email: true,
              fullName: true,
              companyName: true,
              country: true,
            },
          },
        },
      },

      organizationMembers: {
        where: {
          status: "active",
        },
        select: {
          id: true,
          role: true,
          status: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      transactions: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
        },
      },

      _count: {
        select: {
          transactions: true,
          organizationMembers: true,
        },
      },
    },
  });

  return NextResponse.json({
    results: users.map((u) => ({
      ...u,
      lastTransactionAt: u.transactions[0]?.createdAt ?? null,
    })),
  });
}