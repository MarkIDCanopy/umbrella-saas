// src/app/api/services/phone-status/bulk/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getUmbrellaAccessToken } from "@/lib/umbrella/auth";
import {
  chargeUsageCredits,
  InsufficientCreditsError,
} from "@/lib/billing/chargeUsage";

const SERVICE_KEY = "phone-status";

function toFiniteInt(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function normalizeProviderStatus(raw: any): "OK" | "REVIEW" | "NOK" | "ERROR" {
  const code = Number(raw?.status?.code);
  if (code >= 200 && code < 300) return "OK";
  if (code >= 300 && code < 400) return "REVIEW";
  if (code >= 400 && code < 500) return "NOK";
  return "ERROR";
}

async function readJsonOrNull(res: Response) {
  return await res.json().catch(() => null);
}

export async function POST(req: Request) {
  const startedBatch = Date.now();
  const batchId = crypto.randomUUID();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, activeOrgId } = session;

  // ✅ bulk is live-only in YOUR billing system
  const environment: "live" = "live";

  // ✅ normalize orgId (avoid string/garbage)
  const orgId = activeOrgId == null ? null : toFiniteInt(activeOrgId);

  const raw = await req.json().catch(() => null);
  const items = raw?.items;

  if (
    !Array.isArray(items) ||
    !items.every(
      (i: any) => typeof i?.phoneNumber === "string" && i.phoneNumber.length > 0
    )
  ) {
    return NextResponse.json(
      { error: "Invalid payload: expected { items: [{ phoneNumber: string }] }" },
      { status: 400 }
    );
  }

  // Provider mode: sandbox in dev, live in prod
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

  const phoneStatusUrl = `${apiBase.replace(/\/$/, "")}/phone-service/phoneStatus`;

  const itemResults = await Promise.all(
    items.map(async (payload: { phoneNumber: string }) => {
      const started = Date.now();

      let response: any = null;
      let status: "OK" | "REVIEW" | "NOK" | "ERROR" = "ERROR";
      let shouldCharge = false;
      let providerStatus: number | null = null;

      try {
        const res = await fetch(phoneStatusUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        providerStatus = res.status;

        // ✅ charge for 2xx + 4xx, don't charge for 5xx
        shouldCharge = res.status < 500;

        response = await readJsonOrNull(res);

        // ✅ status reflects provider payload status.code
        status = normalizeProviderStatus(response);
      } catch (err: any) {
        response = {
          error: "Provider unreachable",
          details: err?.message ?? String(err),
        };
        status = "ERROR";
        shouldCharge = false;
      }

      const durationMs = Date.now() - started;

      const txn = await prisma.transaction.create({
        data: {
          userId,
          organizationId: orgId ?? null, // ✅ normalized
          service: SERVICE_KEY,
          status,
          environment,
          executionMode: "bulk",
          batchId,
          durationMs,
          request: payload ?? {},
          response: response ?? {},
        },
      });

      return {
        response,
        shouldCharge,
        txnId: txn.id,
        providerStatus,
        status,
      };
    })
  );

  const chargeable = itemResults.filter((r) => r.shouldCharge);
  const chargedUnits = chargeable.length;

  // ✅ always strings
  const umbrellaTxnIds = chargeable.map((r) => String(r.txnId));

  let walletId: number | null = null;
  let balanceBefore: number | null = null;
  let balanceAfter: number | null = null;

  if (chargedUnits > 0) {
    const owner =
      orgId != null
        ? ({ kind: "org", organizationId: orgId, userId } as const)
        : ({ kind: "user", userId } as const);

    const wallet =
      owner.kind === "org"
        ? await prisma.creditWallet.findUnique({
            where: { organizationId: owner.organizationId },
            select: { id: true, balance: true },
          })
        : await prisma.creditWallet.findUnique({
            where: { userId: owner.userId },
            select: { id: true, balance: true },
          });

    walletId = wallet?.id ?? null;
    balanceBefore = wallet?.balance ?? null;

    try {
      await chargeUsageCredits({
        owner,
        serviceKey: SERVICE_KEY,
        units: chargedUnits,
        environment,
        umbrellaTxnIds,
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
            providerSandbox,
            debug: itemResults.map((r) => ({
              providerStatus: r.providerStatus,
              shouldCharge: r.shouldCharge,
              status: r.status,
            })),
            results: itemResults.map((r) => r.response),
          },
          { status: 402 }
        );
      }
      throw e;
    }

    const walletAfterRow =
      owner.kind === "org"
        ? await prisma.creditWallet.findUnique({
            where: { organizationId: owner.organizationId },
            select: { balance: true },
          })
        : await prisma.creditWallet.findUnique({
            where: { userId: owner.userId },
            select: { balance: true },
          });

    balanceAfter = walletAfterRow?.balance ?? null;
  }

  return NextResponse.json({
    batchId,
    count: itemResults.length,
    chargedUnits,
    walletId,
    balanceBefore,
    balanceAfter,
    providerSandbox,
    durationMs: Date.now() - startedBatch,
    debug: itemResults.map((r) => ({
      providerStatus: r.providerStatus,
      shouldCharge: r.shouldCharge,
      status: r.status,
    })),
    results: itemResults.map((r) => r.response),
  });
}