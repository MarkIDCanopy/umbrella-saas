// src/app/api/admin/organizations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const status = searchParams.get("status") ?? "all";

  const and: any[] = [];

  if (query) {
    and.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { orgUid: { contains: query, mode: "insensitive" } },
        { billingEmail: { contains: query, mode: "insensitive" } },
        {
          createdByUser: {
            email: { contains: query, mode: "insensitive" },
          },
        },
        {
          createdByUser: {
            fullName: { contains: query, mode: "insensitive" },
          },
        },
        {
          members: {
            some: {
              OR: [
                { email: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
                {
                  user: {
                    email: { contains: query, mode: "insensitive" },
                  },
                },
                {
                  user: {
                    fullName: { contains: query, mode: "insensitive" },
                  },
                },
              ],
            },
          },
        },
      ],
    });
  }

  if (status === "team-enabled") {
    and.push({ teamEnabled: true });
  }

  if (status === "with-credits") {
    and.push({
      creditWallet: {
        is: {
          balance: {
            gt: 0,
          },
        },
      },
    });
  }

  if (status === "no-wallet") {
    and.push({
      OR: [
        { creditWallet: { is: null } },
        {
          creditWallet: {
            is: {
              balance: 0,
            },
          },
        },
      ],
    });
  }

  const organizations = await prisma.organization.findMany({
    where: and.length ? { AND: and } : undefined,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      orgUid: true,
      name: true,
      teamEnabled: true,
      billingEmail: true,
      billingCountry: true,
      createdAt: true,
      updatedAt: true,
      createdByUser: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
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
      members: {
        orderBy: [{ joinedAt: "desc" }, { invitedAt: "desc" }],
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      },
      transactions: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: {
          createdAt: true,
        },
      },
      _count: {
        select: {
          members: true,
          transactions: true,
        },
      },
    },
  });

  return NextResponse.json({
    results: organizations.map((org) => ({
      ...org,
      lastTransactionAt: org.transactions[0]?.createdAt ?? null,
      transactions: undefined,
    })),
  });
}