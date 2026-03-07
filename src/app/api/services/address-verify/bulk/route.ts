// src/app/api/services/address-verify/bulk/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getUmbrellaAccessToken } from "@/lib/umbrella/auth";
import { chargeUsageCredits, InsufficientCreditsError } from "@/lib/billing/chargeUsage";
import { eurToCredits } from "@/lib/billing/pricing";

function normalizeStatus(v: any): "OK" | "REVIEW" | "NOK" | "ERROR" {
  const s = String(v ?? "").toUpperCase();
  if (s === "OK") return "OK";
  if (s === "NOK") return "NOK";
  if (s === "REVIEW") return "REVIEW";
  return "ERROR";
}

function normalizeCountry(country?: string): string {
  return String(country ?? "").trim().toUpperCase();
}

function isAustriaCountry(v: any) {
  return normalizeCountry(v) === "AT";
}

type BulkCompliance = {
  acceptedTerms?: boolean;
  reason?: string;
};

const SERVICE_KEY = "address-verification"; // ✅ canonical Service.key

export async function POST(req: Request) {
  const startedBatch = Date.now();
  const batchId = crypto.randomUUID();

  // -----------------------------
  // AUTH (your app session)
  // -----------------------------
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId, activeOrgId } = session;

  // ✅ BULK IS ALWAYS LIVE (for billing/ledger + UI)
  const env: "live" = "live";

  // -----------------------------
  // PAYLOAD
  // -----------------------------
  const raw = await req.json().catch(() => null);
  const items = raw?.items;
  const compliance = raw?.compliance as BulkCompliance | undefined;

  if (!Array.isArray(items)) {
    return NextResponse.json(
      { error: "Invalid payload: expected { items: [] }" },
      { status: 400 }
    );
  }

  // // If there are AT items, require compliance
  // const hasAT = items.some((i: any) => isAustriaCountry(i?.country));
  // if (hasAT) {
  //   const ok =
  //     compliance?.acceptedTerms === true &&
  //     typeof compliance?.reason === "string" &&
  //     compliance.reason.length > 0;

  //   if (!ok) {
  //     return NextResponse.json(
  //       {
  //         error:
  //           "Missing compliance confirmation for Austria (AT). Please accept terms and provide a reason.",
  //       },
  //       { status: 400 }
  //     );
  //   }
  // }

  // -----------------------------
  // PROVIDER MODE
  // In dev: sandbox provider
  // In prod: live provider
  // -----------------------------
  const providerSandbox = process.env.NODE_ENV !== "production";

  let token: string;
  try {
    token = await getUmbrellaAccessToken({ sandbox: providerSandbox });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Provider auth failed",
        providerSandbox,
        details: err?.message ?? String(err),
      },
      { status: 502 }
    );
  }

  const apiBase = providerSandbox
    ? process.env.UMBRELLA_API_BASE_SANDBOX
    : process.env.UMBRELLA_API_BASE;

  if (!apiBase) {
    return NextResponse.json(
      { error: "Umbrella API base URL not configured", providerSandbox },
      { status: 500 }
    );
  }

  const verifyUrl = `${apiBase.replace(/\/$/, "")}/address/verify`;

  // -----------------------------
  // Load service + prices once
  // -----------------------------
  const service = await prisma.service.findUnique({
    where: { key: SERVICE_KEY },
    select: { id: true, priceCredits: true },
  });

  if (!service) {
    return NextResponse.json(
      { error: `Service not found for key="${SERVICE_KEY}"` },
      { status: 500 }
    );
  }

  // Preload active country prices for this service (fast lookup in memory)
  const priceRows = await prisma.serviceCountryPrice.findMany({
    where: { serviceId: service.id, active: true },
    select: { countryCode: true, priceEur: true },
  });

  const eurByCountry = new Map<string, number>();
  for (const r of priceRows) {
    eurByCountry.set(String(r.countryCode).toUpperCase(), Number(r.priceEur));
  }

  // -----------------------------
  // PROCESS ITEMS
  // Billing rule: charge unless provider unreachable or provider returns 5xx
  // -----------------------------
  const itemResults = await Promise.all(
    items.map(async (originalPayload: any) => {
      const started = Date.now();

      // ✅ apply compliance only to AT items
      const payload =
        isAustriaCountry(originalPayload?.country) && compliance
          ? { ...originalPayload, compliance }
          : originalPayload;

      let response: any = null;
      let status: "OK" | "REVIEW" | "NOK" | "ERROR" = "ERROR";
      let shouldCharge = false;

      try {
        const res = await fetch(verifyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        // charge 2xx + 4xx, do not charge 5xx
        shouldCharge = res.status < 500;

        try {
          response = await res.json();
        } catch {
          response = null;
        }

        status = res.ok
          ? normalizeStatus(response?.globalResult?.overall)
          : res.status >= 500
          ? "ERROR"
          : "NOK";
      } catch (err: any) {
        response = { error: err?.message ?? String(err) };
        status = "ERROR";
        shouldCharge = false;
      }

      const durationMs = Date.now() - started;

      const txn = await prisma.transaction.create({
        data: {
          userId,
          organizationId: activeOrgId,
          service: SERVICE_KEY,
          status,
          environment: env,
          executionMode: "bulk",
          batchId,
          durationMs,
          request: payload ?? {},
          response: response ?? {},
        },
      });

      // Compute credits for this item (only if shouldCharge)
      const cc = normalizeCountry(payload?.country);

      let itemCredits = 0;
      if (shouldCharge) {
        const eur = cc ? eurByCountry.get(cc) : undefined;
        itemCredits =
          typeof eur === "number" && eur > 0
            ? eurToCredits(eur)
            : service.priceCredits ?? 0;
      }

      return {
        response,
        shouldCharge,
        txnId: txn.id,
        countryCode: cc,
        itemCredits,
      };
    })
  );

  const chargeableCount = itemResults.reduce(
    (acc, r) => acc + (r.shouldCharge ? 1 : 0),
    0
  );

  const totalCreditsToCharge = itemResults.reduce(
    (acc, r) => acc + (r.shouldCharge ? r.itemCredits : 0),
    0
  );

  // -----------------------------
  // DEBUG: wallet + balances
  // -----------------------------
  let walletId: number | null = null;
  let balanceBefore: number | null = null;
  let balanceAfter: number | null = null;

  // -----------------------------
  // CHARGE ONCE for total credits
  // -----------------------------
  if (chargeableCount > 0 && totalCreditsToCharge > 0) {
    const owner = activeOrgId
      ? ({ kind: "org", organizationId: activeOrgId, userId } as const)
      : ({ kind: "user", userId } as const);

    // snapshot BEFORE
    const walletBefore =
      owner.kind === "org"
        ? await prisma.creditWallet.findUnique({
            where: { organizationId: owner.organizationId },
            select: { id: true, balance: true },
          })
        : await prisma.creditWallet.findUnique({
            where: { userId: owner.userId },
            select: { id: true, balance: true },
          });

    walletId = walletBefore?.id ?? null;
    balanceBefore = walletBefore?.balance ?? null;

    // We charge "units: 1" and pass unitPriceCredits = totalCreditsToCharge
    // so ledger shows a single usage txn for the batch.
try {
  await chargeUsageCredits({
    owner,
    serviceKey: SERVICE_KEY,
    units: 1,
    environment: env,
    umbrellaTxnIds: [batchId],
    unitPriceCredits: totalCreditsToCharge,
  });
} catch (e: any) {
  if (e instanceof InsufficientCreditsError) {
    return NextResponse.json(
      {
        error: "Not enough credits. Please refill your balance.",
        code: e.code,
        balance: e.balance,
        required: e.required,
        refillUrl: "/dashboard/billing",
        batchId,
        count: itemResults.length,
        chargedUnits: 0,
        totalCreditsCharged: 0,
        providerSandbox,
        // keep results so UI can show something if you want
        results: itemResults.map((r) => r.response),
        perItem: itemResults.map((r) => ({
          txnId: r.txnId,
          shouldCharge: r.shouldCharge,
          country: r.countryCode,
          credits: r.itemCredits,
        })),
      },
      { status: 402 }
    );
  }
  throw e;
}


    // snapshot AFTER
    const walletAfter =
      owner.kind === "org"
        ? await prisma.creditWallet.findUnique({
            where: { organizationId: owner.organizationId },
            select: { balance: true },
          })
        : await prisma.creditWallet.findUnique({
            where: { userId: owner.userId },
            select: { balance: true },
          });

    balanceAfter = walletAfter?.balance ?? null;
  }

  return NextResponse.json({
    batchId,
    count: itemResults.length,
    chargedUnits: chargeableCount,
    totalCreditsCharged: totalCreditsToCharge,
    walletId,
    balanceBefore,
    balanceAfter,
    providerSandbox,
    durationMs: Date.now() - startedBatch,
    results: itemResults.map((r) => r.response),
    // optional debug:
    perItem: itemResults.map((r) => ({
      txnId: r.txnId,
      shouldCharge: r.shouldCharge,
      country: r.countryCode,
      credits: r.itemCredits,
    })),
  });
}
