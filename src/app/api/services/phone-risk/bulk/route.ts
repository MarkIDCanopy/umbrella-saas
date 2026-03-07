// src/app/api/services/phone-risk/bulk/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getUmbrellaAccessToken } from "@/lib/umbrella/auth";
import {
  chargeUsageCredits,
  InsufficientCreditsError,
} from "@/lib/billing/chargeUsage";
import { explainRiskScore, mapReasonCodes } from "@/lib/services/phoneRiskScore/mappings";

const SERVICE_KEY = "phone-risk";

function toFiniteInt(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

async function readJsonOrNull(res: Response) {
  return await res.json().catch(() => null);
}

function mapProviderResponse(raw: any) {
  const data = raw?.data ?? null;

  const riskScore =
    typeof data?.risk?.score === "number" ? data.risk.score : null;
  const explained = explainRiskScore(riskScore);

  return {
    status: Boolean(raw?.status),
    referenceId: data?.referenceId ?? null,
    externalId: data?.externalId ?? null,
    statusInfo: {
      code: data?.status?.code ?? null,
      description: data?.status?.description ?? null,
      updatedOn: data?.status?.updatedOn ?? null,
    },
    phoneType: data?.phoneType?.description ?? null,
    carrier: data?.carrier?.name ?? null,
    location: {
      country: data?.location?.country?.name ?? null,
      iso2: data?.location?.country?.iso2 ?? null,
      city: data?.location?.city ?? null,
    },
    blocklisting: {
      blocked: Boolean(data?.blocklisting?.blocked),
      description: data?.blocklisting?.blockDescription ?? null,
    },
    risk: {
      score: riskScore,
      level: data?.risk?.level ?? null,
      recommendation: data?.risk?.recommendation ?? null,
      interpretation: explained
        ? {
            band: explained.band,
            recommendation: explained.recommendation,
            explanation: explained.explanation,
          }
        : null,
    },
    riskInsights: {
      category: mapReasonCodes(data?.riskInsights?.category),
      a2p: mapReasonCodes(data?.riskInsights?.a2P),
      p2p: mapReasonCodes(data?.riskInsights?.p2P),
      numberType: mapReasonCodes(data?.riskInsights?.numberType),
      ip: mapReasonCodes(data?.riskInsights?.ip),
      email: mapReasonCodes(data?.riskInsights?.email),
    },
  };
}

export async function POST(req: Request) {
  const startedBatch = Date.now();
  const batchId = crypto.randomUUID();

  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, activeOrgId } = session;

  const environment: "live" = "live";
  const orgId = activeOrgId == null ? null : toFiniteInt(activeOrgId);

  const raw = await req.json().catch(() => null);

  // ✅ Option B: allow either { items: [...] } OR raw [...]
  const items = Array.isArray(raw) ? raw : raw?.items;

  if (
    !Array.isArray(items) ||
    !items.every(
      (i: any) =>
        typeof i?.phoneNumber === "string" &&
        i.phoneNumber.trim().length > 0 &&
        (i.emailAddress == null || typeof i.emailAddress === "string")
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid payload: expected { items: [{ phoneNumber: string, emailAddress?: string }] }",
      },
      { status: 400 }
    );
  }

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

  const url = `${apiBase.replace(/\/$/, "")}/phone-service/phoneRiskScore`;

  const itemResults = await Promise.all(
    items.map(async (item: { phoneNumber: string; emailAddress?: string }) => {
      const started = Date.now();

      const payload = {
        phoneNumber: item.phoneNumber.trim(),
        emailAddress:
          typeof item.emailAddress === "string" &&
          item.emailAddress.trim().length > 0
            ? item.emailAddress.trim()
            : undefined,
        accountLifecycleEvent: "transact" as const,
      };

      let providerStatus: number | null = null;
      let shouldCharge = false;
      let providerBody: any = null;

      let txnStatus: "OK" | "REVIEW" | "NOK" | "ERROR" = "ERROR";

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        providerStatus = res.status;
        shouldCharge = res.status < 500;
        providerBody = await readJsonOrNull(res);

        const providerCode = Number(providerBody?.data?.status?.code);

        txnStatus =
          providerCode === 300
            ? "OK"
            : Number.isFinite(providerCode) && providerCode >= 400 && providerCode < 500
            ? "NOK"
            : res.status >= 500
            ? "ERROR"
            : !res.ok
            ? "NOK"
            : "REVIEW";
      } catch (err: any) {
        providerBody = {
          error: "Provider unreachable",
          details: err?.message ?? String(err),
        };
        providerStatus = null;
        shouldCharge = false;
        txnStatus = "ERROR";
      }

      const durationMs = Date.now() - started;

      const txn = await prisma.transaction.create({
        data: {
          userId,
          organizationId: orgId ?? null,
          service: SERVICE_KEY,
          status: txnStatus,
          environment,
          executionMode: "bulk",
          batchId,
          durationMs,
          request: payload as any,
          response: providerBody ?? ({} as any),
        },
      });

      return {
        txnId: txn.id,
        providerStatus,
        shouldCharge,
        mapped: mapProviderResponse(providerBody),
      };
    })
  );

  const chargeable = itemResults.filter((r) => r.shouldCharge);
  const chargedUnits = chargeable.length;
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
            results: itemResults.map((r) => r.mapped),
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
    results: itemResults.map((r) => r.mapped),
    debug: itemResults.map((r) => ({
      providerStatus: r.providerStatus,
      shouldCharge: r.shouldCharge,
    })),
  });
}