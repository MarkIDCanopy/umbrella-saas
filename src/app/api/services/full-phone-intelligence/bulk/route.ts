// src/app/api/services/full-phone-intelligence/bulk/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getUmbrellaAccessToken } from "@/lib/umbrella/auth";
import {
  chargeUsageCredits,
  InsufficientCreditsError,
} from "@/lib/billing/chargeUsage";
import {
  cleanExternalId,
  cleanPhoneInput,
  normalizePhoneNumberForProvider,
} from "@/lib/input-safeguards";

const SERVICE_KEY = "full-phone-intelligence";

type SafePayload = {
  phoneNumber: string;
  externalId?: string;
};

function toFiniteInt(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function normalizeProviderStatus(raw: any): "OK" | "REVIEW" | "NOK" | "ERROR" {
  const code = Number(raw?.data?.status?.code);
  if (code === 300) return "OK";
  if (code >= 400 && code < 500) return "NOK";
  if (code >= 200 && code < 400) return "REVIEW";
  return "ERROR";
}

async function readJsonOrNull(res: Response) {
  return await res.json().catch(() => null);
}

function sanitizePayload(raw: any): SafePayload | null {
  const phone = cleanPhoneInput(String(raw?.phoneNumber ?? ""));
  if (!phone || phone.replace(/\D/g, "").length < 8) return null;

  const out: SafePayload = {
    phoneNumber: phone,
  };

  if (typeof raw?.externalId === "string" && raw.externalId.trim()) {
    out.externalId = cleanExternalId(raw.externalId);
  }

  return out;
}

function buildProviderPayload(input: SafePayload) {
  const payload: any = {
    phoneNumber: normalizePhoneNumberForProvider(input.phoneNumber),
  };

  if (input.externalId) payload.externalId = input.externalId;

  return payload;
}

export async function POST(req: Request) {
  const startedBatch = Date.now();
  const batchId = crypto.randomUUID();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, activeOrgId } = session;
  const environment: "live" = "live";
  const orgId = activeOrgId == null ? null : toFiniteInt(activeOrgId);

  const raw = await req.json().catch(() => null);
  const items = raw?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "Invalid payload: expected { items: [...] }" },
      { status: 400 }
    );
  }

  const safeItems = items.map(sanitizePayload);
  if (safeItems.some((x) => !x)) {
    return NextResponse.json(
      {
        error:
          "One or more items are invalid. Each item must include a valid phone number including country code.",
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

  const url = `${apiBase.replace(/\/$/, "")}/phone-service/fullPhoneIntelligence`;

  const itemResults = await Promise.all(
    (safeItems as SafePayload[]).map(async (safeInput) => {
      const started = Date.now();

      let response: any = null;
      let status: "OK" | "REVIEW" | "NOK" | "ERROR" = "ERROR";
      let shouldCharge = false;
      let providerStatus: number | null = null;

      try {
        const providerPayload = buildProviderPayload(safeInput);

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(providerPayload),
        });

        providerStatus = res.status;
        shouldCharge = res.status < 500;
        response = await readJsonOrNull(res);
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
          organizationId: orgId ?? null,
          service: SERVICE_KEY,
          status,
          environment,
          executionMode: "bulk",
          batchId,
          durationMs,
          request: safeInput,
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