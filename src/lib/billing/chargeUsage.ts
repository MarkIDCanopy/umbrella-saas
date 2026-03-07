// src/lib/billing/chargeUsage.ts
import { prisma } from "@/lib/prisma";
import { getOrCreateWallet } from "@/lib/billing/wallet";

export type BillingOwner =
  | { kind: "user"; userId: number }
  | { kind: "org"; organizationId: number; userId: number };

export type ChargeUsageArgs = {
  owner: BillingOwner;
  serviceKey: string;
  units: number;
  environment: "test" | "live";
  umbrellaTxnIds?: string[];

  // optional per-unit override (e.g. dynamic country pricing)
  unitPriceCredits?: number;
};

export class InsufficientCreditsError extends Error {
  code = "INSUFFICIENT_CREDITS" as const;
  balance: number;
  required: number;

  constructor(balance: number, required: number) {
    super("Insufficient credits");
    this.balance = balance;
    this.required = required;
  }
}

export async function computeUsageCostCredits(args: {
  serviceKey: string;
  units: number;
  unitPriceCredits?: number;
}): Promise<{ serviceId: number; perUnit: number; total: number } | null> {
  const { serviceKey, units, unitPriceCredits } = args;

  if (!units || units <= 0) return null;

  const service = await prisma.service.findUnique({
    where: { key: serviceKey },
    select: { id: true, priceCredits: true },
  });

  if (!service) return null;

  const perUnit =
    typeof unitPriceCredits === "number" &&
    Number.isFinite(unitPriceCredits) &&
    unitPriceCredits > 0
      ? Math.floor(unitPriceCredits)
      : Number(service.priceCredits ?? 0);

  const total = perUnit * units;

  return { serviceId: service.id, perUnit, total };
}

export async function assertSufficientCredits(args: {
  owner: BillingOwner;
  requiredCredits: number;
}): Promise<{ balance: number; required: number }> {
  const { owner, requiredCredits } = args;

  const required = Math.max(0, Math.floor(requiredCredits || 0));

  if (required <= 0) return { balance: 0, required };

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

  return { balance, required };
}

export async function chargeUsageCredits(args: ChargeUsageArgs): Promise<void> {
  const { owner, serviceKey, units, environment, umbrellaTxnIds, unitPriceCredits } = args;
  if (!units || units <= 0) return;

  const wallet = await getOrCreateWallet(
    owner.kind === "user"
      ? { kind: "user", userId: owner.userId }
      : { kind: "org", organizationId: owner.organizationId }
  );

  const cost = await computeUsageCostCredits({ serviceKey, units, unitPriceCredits });
  if (!cost) {
    console.error("chargeUsageCredits: unknown service key", serviceKey);
    return;
  }

  const { serviceId, perUnit, total } = cost;

  if (total <= 0) {
    console.warn(`chargeUsageCredits: price not set for ${serviceKey}`);
    return;
  }

  // Build one ledger row per txn ID, each showing its own per-unit cost.
  // Falls back to a single row with null umbrellaTxnId if none provided.
  const buildLedgerRows = (deltaPerRow: number) => {
    if (!umbrellaTxnIds?.length) {
      return [{
        walletId: wallet.id,
        type: "usage" as const,
        source: "internal" as const,
        delta: deltaPerRow,
        serviceId,
        umbrellaTxnId: null,
        description: `${serviceKey} x${units}`,
      }];
    }

    return umbrellaTxnIds.map((txnId) => ({
      walletId: wallet.id,
      type: "usage" as const,
      source: "internal" as const,
      delta: deltaPerRow,
      serviceId,
      umbrellaTxnId: txnId,
      description: `${serviceKey} x1`,
    }));
  };

  // TEST: optional ledger entry per txn, no deduction
  if (environment === "test") {
    const rows = buildLedgerRows(0);
    await prisma.creditTransaction.createMany({ data: rows });
    return;
  }

  // LIVE: enforce non-negative atomically, then write one ledger row per txn
  await prisma.$transaction(async (tx) => {
    const current = await tx.creditWallet.findUnique({
      where: { id: wallet.id },
      select: { balance: true },
    });

    const balance = Number(current?.balance ?? 0);
    if (balance < total) {
      throw new InsufficientCreditsError(balance, total);
    }

    await tx.creditWallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: total } },
    });

    // Each txn row gets -perUnit so the UI shows cost per individual transaction
    const rows = buildLedgerRows(-perUnit);
    await tx.creditTransaction.createMany({ data: rows });
  });
}