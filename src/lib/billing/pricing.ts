// src/lib/billing/pricing.ts
import { prisma } from "@/lib/prisma";

export const CREDIT_EUR = 0.2; // 1 credit = €0.20

export function eurToCredits(eur: number): number {
  if (!Number.isFinite(eur) || eur <= 0) return 0;
  return Math.ceil(eur / CREDIT_EUR);
}

export async function getServiceCountryCostCredits(opts: {
  serviceKey: string;
  countryCode?: string | null;
  fallbackCredits: number; // e.g. minimal tier
}) {
  const cc = String(opts.countryCode ?? "").trim().toUpperCase();

  // Find service
  const service = await prisma.service.findUnique({
    where: { key: opts.serviceKey },
    select: { id: true },
  });

  if (!service) return opts.fallbackCredits;
  if (!cc) return opts.fallbackCredits;

  const row = await prisma.serviceCountryPrice.findFirst({
    where: {
      serviceId: service.id,
      countryCode: cc,
      active: true,
    },
    select: { priceEur: true },
  });

  if (!row?.priceEur) return opts.fallbackCredits;

  // Decimal -> number
  const eur = Number(row.priceEur);
  const credits = eurToCredits(eur);
  return credits > 0 ? credits : opts.fallbackCredits;
}
