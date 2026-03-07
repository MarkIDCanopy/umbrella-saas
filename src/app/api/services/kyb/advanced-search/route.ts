// src/app/api/services/kyb/advanced-search/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getUmbrellaAccessToken } from "@/lib/umbrella/auth";
import {
  chargeUsageCredits,
  InsufficientCreditsError,
} from "@/lib/billing/chargeUsage";
import {
  mapKybAdvancedResponse,
  extractKybProviderError,
  type KybIncludeOptions,
} from "@/lib/services/mappers/kyb";

const SERVICE_KEY = "kyb";

function toFiniteInt(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

async function readJsonOrText(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await res.json().catch(() => null);
  }
  const text = await res.text().catch(() => "");
  return text ? { raw: text } : null;
}

const DEFAULT_INCLUDE: KybIncludeOptions = {
  officers: true,
  addresses: true,
  ownerships: true,
  transparency: true,
  documents: true,
  financials: true,
};

export async function POST(req: Request) {
  const started = Date.now();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, activeOrgId } = session;
  const orgId = activeOrgId == null ? null : toFiniteInt(activeOrgId);
  const environment: "live" = "live";

  const raw = (await req.json().catch(() => ({}))) as {
    transactionId?: string;
    companyId?: string;
    include?: Partial<KybIncludeOptions>;
  };

  if (
    typeof raw.transactionId !== "string" ||
    raw.transactionId.trim().length === 0 ||
    typeof raw.companyId !== "string" ||
    raw.companyId.trim().length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid payload: expected { transactionId: string, companyId: string, include?: {...} }",
      },
      { status: 400 }
    );
  }

  const include: KybIncludeOptions = {
    ...DEFAULT_INCLUDE,
    ...(raw.include ?? {}),
  };

  const payload = {
    transactionId: raw.transactionId.trim(),
    companyId: raw.companyId.trim(),
    include,
  };

  const providerSandbox = process.env.NODE_ENV !== "production";

  let token: string;
  try {
    token = await getUmbrellaAccessToken({ sandbox: providerSandbox });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Provider auth failed",
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

  const url = `${apiBase.replace(/\/$/, "")}/kyb/company/details`;

  let res: Response;
  let providerBody: any = null;

  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    providerBody = await readJsonOrText(res);
  } catch (err: any) {
    const durationMs = Date.now() - started;

    await prisma.transaction.create({
      data: {
        userId,
        organizationId: orgId ?? null,
        service: SERVICE_KEY,
        status: "ERROR",
        environment,
        executionMode: "single",
        durationMs,
        request: {
          operation: "advanced-search",
          ...payload,
        } as any,
        response: {
          error: "Provider unreachable",
          details: err?.message ?? String(err),
        } as any,
      },
    });

    return NextResponse.json(
      { error: "Provider unreachable", details: err?.message ?? String(err) },
      { status: 502 }
    );
  }

  const durationMs = Date.now() - started;

  const mapped = mapKybAdvancedResponse(providerBody);

  const txnStatus: "OK" | "NOK" | "ERROR" | "REVIEW" = res.ok
    ? "OK"
    : res.status >= 500
    ? "ERROR"
    : "NOK";

  const shouldCharge = res.ok;

  const txn = await prisma.transaction.create({
    data: {
      userId,
      organizationId: orgId ?? null,
      service: SERVICE_KEY,
      status: txnStatus,
      environment,
      executionMode: "single",
      durationMs,
      request: {
        operation: "advanced-search",
        ...payload,
      } as any,
      response: providerBody ?? ({} as any),
    },
  });

  if (shouldCharge) {
    const owner =
      orgId != null
        ? ({ kind: "org", organizationId: orgId, userId } as const)
        : ({ kind: "user", userId } as const);

    try {
      await chargeUsageCredits({
        owner,
        serviceKey: SERVICE_KEY,
        units: 1,
        environment,
        umbrellaTxnIds: [String(txn.id)],
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
            charged: false,
          },
          { status: 402 }
        );
      }
      throw e;
    }
  }

  if (!res.ok) {
    return NextResponse.json(
      {
        error: "Advanced search failed",
        providerStatus: res.status,
        providerError: extractKybProviderError(providerBody),
        charged: shouldCharge,
        providerSandbox,
      },
      { status: res.status }
    );
  }

  return NextResponse.json(mapped);
}