// src/app/api/user/update/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/UserAuth";

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      fullName?: string;
      email?: string;
      country?: string | null;
    };

    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    // country: undefined => don't change
    // null => set null
    // string => normalize and set
    const countryRaw = body.country;

    if (!fullName || !email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    // 1) Check if another user already has this email
    const existingEmail = await prisma.user.findFirst({
      where: {
        email,
        id: { not: sessionUser.id },
      },
      select: { id: true },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email is already used by another account." },
        { status: 409 }
      );
    }

    const normalizedCountry =
      countryRaw === undefined
        ? undefined
        : countryRaw === null
          ? null
          : String(countryRaw).trim().toUpperCase();

    // 2) Update user + mirror into PERSONAL billing profile if it exists
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: sessionUser.id },
        data: {
          fullName,
          email,
          ...(normalizedCountry !== undefined ? { country: normalizedCountry } : {}),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          twofaEnabled: true,
          country: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // mirror -> personal billing if it exists
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
              fullName,
              email,
              ...(normalizedCountry !== undefined
                ? { country: normalizedCountry ?? "AT" }
                : {}),
              updatedAt: new Date(),
            },
          });
        }
      }

      return user;
    });

    // Return in snake_case to match your UserContext type
    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        full_name: updated.fullName,
        twofaEnabled: updated.twofaEnabled,
        country: updated.country,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
      },
      message: "Profile updated successfully",
    });
  } catch (err) {
    console.error("USER UPDATE ERROR", err);
    return NextResponse.json(
      { error: "Unexpected error updating profile." },
      { status: 500 }
    );
  }
}
