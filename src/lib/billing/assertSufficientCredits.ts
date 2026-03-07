// src/lib/billing/assertSufficientCredits.ts
import { prisma } from "@/lib/prisma";
import { getOrCreateWallet } from "@/lib/billing/wallet";
import type { BillingOwner } from "@/lib/billing/chargeUsage";
import { InsufficientCreditsError } from "@/lib/billing/chargeUsage";

export async function assertSufficientCredits(args: {
  owner: BillingOwner;
  required: number;
}): Promise<{ balance: number }> {
  const { owner, required } = args;

  if (!required || required <= 0) {
    return { balance: 0 };
  }

  // Use your canonical wallet resolver (same as chargeUsageCredits)
  const wallet = await getOrCreateWallet(
    owner.kind === "user"
      ? { kind: "user", userId: owner.userId }
      : { kind: "org", organizationId: owner.organizationId }
  );

  const current = await prisma.creditWallet.findUnique({
    where: { id: wallet.id },
    select: { balance: true },
  });

  const balance = Number(current?.balance ?? 0);

  if (balance < required) {
    throw new InsufficientCreditsError(balance, required);
  }

  return { balance };
}
