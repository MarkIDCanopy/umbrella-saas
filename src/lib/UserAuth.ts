// src/lib/UserAuth.ts
import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export type AuthUser = {
  id: number;
  email: string;
  full_name: string | null;
  twofa_enabled: boolean;
  country: string | null;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  // 👇 FIX IS HERE
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) return null;

  const session = await prisma.session.findFirst({
    where: {
      sessionToken,
      expiresAt: { gt: new Date() },
    },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          twofaEnabled: true,
          country: true,
        },
      },
    },
  });

  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    full_name: session.user.fullName,
    twofa_enabled: session.user.twofaEnabled,
    country: session.user.country,
  };
}
