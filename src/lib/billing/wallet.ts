// src/lib/billing/wallet.ts
import { prisma } from "@/lib/prisma";

export type WalletOwner =
  | { kind: "user"; userId: number }
  | { kind: "org"; organizationId: number };

export async function getOrCreateWallet(owner: WalletOwner) {
  if (owner.kind === "user") {
    return prisma.creditWallet.upsert({
      where: { userId: owner.userId },
      update: {},
      create: { userId: owner.userId, balance: 0 },
    });
  }

  return prisma.creditWallet.upsert({
    where: { organizationId: owner.organizationId },
    update: {},
    create: { organizationId: owner.organizationId, balance: 0 },
  });
}
