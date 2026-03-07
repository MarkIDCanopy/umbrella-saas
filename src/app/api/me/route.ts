// src/app/api/me/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/UserAuth";
import { prisma } from "@/lib/prisma";

function toUserDTO(u: {
  id: number;
  email: string;
  fullName: string | null;
  country: string | null;
  twofaEnabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.fullName,
    country: u.country,
    twofa_enabled: u.twofaEnabled,
    created_at: u.createdAt ?? null,
    updated_at: u.updatedAt ?? null,
  };
}

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json(
        { user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // ✅ ALWAYS fetch from DB (fresh), don't trust session snapshot
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        country: true,
        twofaEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { user: toUserDTO(dbUser) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("ME GET ERROR", err);
    return NextResponse.json(
      { user: null },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      fullName?: string;
      email?: string;
      country?: string;
    };

    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim() : undefined;

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;

    const country =
      typeof body.country === "string" ? body.country.trim().toUpperCase() : undefined;

    if (email !== undefined && email.length < 5) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (country !== undefined && country.length < 2) {
      return NextResponse.json(
        { error: "Invalid country" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // ✅ uniqueness check
      if (email !== undefined) {
        const existing = await tx.user.findFirst({
          where: { email, id: { not: sessionUser.id } },
          select: { id: true },
        });
        if (existing) {
          return { error: "EMAIL_TAKEN" as const };
        }
      }

      // 1) update user
      const user = await tx.user.update({
        where: { id: sessionUser.id },
        data: {
          ...(fullName !== undefined ? { fullName } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(country !== undefined ? { country } : {}),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          country: true,
          twofaEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // 2) mirror into PERSONAL billing profile (if exists + personal)
      const wallet = await tx.creditWallet.findUnique({
        where: { userId: sessionUser.id },
        select: { id: true },
      });

      if (wallet) {
        const bp = await tx.billingProfile.findUnique({
          where: { walletId: wallet.id },
          select: { billingType: true },
        });

        if (bp?.billingType === "personal") {
          await tx.billingProfile.update({
            where: { walletId: wallet.id },
            data: {
              ...(fullName !== undefined ? { fullName } : {}),
              ...(email !== undefined ? { email } : {}),
              ...(country !== undefined ? { country } : {}),
              updatedAt: new Date(),
            },
          });
        }
      }

      return { user };
    });

    if ((updated as any).error === "EMAIL_TAKEN") {
      return NextResponse.json(
        { error: "Email is already used by another account." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { user: toUserDTO((updated as any).user) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("ME PATCH ERROR", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
