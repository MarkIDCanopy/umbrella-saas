// src/lib/transactions/credits.server.ts
import { prisma } from "@/lib/prisma";

/**
 * Returns a map of transactionId -> creditCost (positive int).
 * Looks up CreditTransaction rows where umbrellaTxnId links to Transaction.id.
 */
export async function getCreditCostsByTxnIds(
  txnIds: string[]
): Promise<Record<string, number>> {
  if (!txnIds.length) return {};

  const rows = await prisma.creditTransaction.findMany({
    where: {
      umbrellaTxnId: { in: txnIds },
      type: "usage",
    },
    select: {
      umbrellaTxnId: true,
      delta: true, // negative for usage
    },
  });

  const out: Record<string, number> = {};
  for (const r of rows) {
    if (!r.umbrellaTxnId) continue;
    out[r.umbrellaTxnId] = Math.abs(r.delta ?? 0);
  }
  return out;
}
