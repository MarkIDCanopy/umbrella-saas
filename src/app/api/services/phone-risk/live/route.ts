// src/app/api/services/phone-risk/live/route.ts
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

// -----------------------------
// IPv4-only originatingIp helper
// Provider requires IPv4 only.
// If invalid (IPv6/::1/etc), OMIT the field.
// -----------------------------
function firstForwardedIp(xff: string) {
  return xff.split(",")[0]?.trim() || "";
}

function isValidIpv4(ip: string) {
  const m = ip.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (!m) return false;
  const parts = ip.split(".").map((x) => Number(x));
  return (
    parts.length === 4 &&
    parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
  );
}

function getOriginatingIpv4(req: Request): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const ip = firstForwardedIp(xff);
    if (isValidIpv4(ip)) return ip;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp && isValidIpv4(realIp.trim())) return realIp.trim();

  const cf = req.headers.get("cf-connecting-ip");
  if (cf && isValidIpv4(cf.trim())) return cf.trim();

  return undefined;
}

async function readJsonOrText(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json().catch(() => null);
  const text = await res.text().catch(() => "");
  return text ? { raw: text } : null;
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
    numbering: {
      original: data?.numbering?.original ?? null,
      cleansing: data?.numbering?.cleansing ?? null,
    },
    phoneType: data?.phoneType?.description ?? null,
    carrier: data?.carrier?.name ?? null,
    location: {
      country: data?.location?.country?.name ?? null,
      iso2: data?.location?.country?.iso2 ?? null,
      city: data?.location?.city ?? null,
      timeZone: data?.location?.timeZone?.name ?? null,
      utcOffsetMin: data?.location?.timeZone?.utcOffsetMin ?? null,
      utcOffsetMax: data?.location?.timeZone?.utcOffsetMax ?? null,
    },
    blocklisting: {
      blocked: Boolean(data?.blocklisting?.blocked),
      description: data?.blocklisting?.blockDescription ?? null,
      code: data?.blocklisting?.blockCode ?? null,
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
      status: data?.riskInsights?.status ?? null,
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
  const started = Date.now();

  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, activeOrgId } = session;

  // ✅ Live-only in your billing system
  const environment: "live" = "live";

  const orgId = activeOrgId == null ? null : toFiniteInt(activeOrgId);

  const raw = (await req.json().catch(() => ({}))) as {
    phoneNumber?: string;
    emailAddress?: string;
  };

  if (
    typeof raw.phoneNumber !== "string" ||
    raw.phoneNumber.trim().length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid payload: expected { phoneNumber: string, emailAddress?: string }",
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
      { error: "Provider auth failed", details: err?.message ?? String(err) },
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

  const ipv4 = getOriginatingIpv4(req);

  const payload = {
    phoneNumber: raw.phoneNumber.trim(),
    emailAddress:
      typeof raw.emailAddress === "string" && raw.emailAddress.trim().length > 0
        ? raw.emailAddress.trim()
        : undefined,
    accountLifecycleEvent: "transact" as const,
    ...(ipv4 ? { originatingIp: ipv4 } : {}),
  };

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
        request: payload as any,
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

  const mapped = mapProviderResponse(providerBody);

  const providerCode = Number(providerBody?.data?.status?.code);

  // Provider semantics: 300 == success
  const txnStatus: "OK" | "REVIEW" | "NOK" | "ERROR" =
    providerCode === 300
      ? "OK"
      : Number.isFinite(providerCode) && providerCode >= 400 && providerCode < 500
      ? "NOK"
      : res.status >= 500
      ? "ERROR"
      : !res.ok
      ? "NOK"
      : "REVIEW"; // fallback for other weird cases

  const providerErrorText =
    typeof providerBody?.error === "string"
      ? providerBody.error
      : typeof providerBody?.raw === "string"
      ? providerBody.raw
      : String(providerBody?.data?.status?.description ?? "");

  // ✅ Do not charge when the 400 is caused by our auto-sent originatingIp
  const isOurOriginatingIpValidationBug =
    res.status === 400 &&
    providerErrorText.toLowerCase().includes("originatingip");

  const shouldCharge = res.status < 500 && !isOurOriginatingIpValidationBug;

  const txn = await prisma.transaction.create({
    data: {
      userId,
      organizationId: orgId ?? null,
      service: SERVICE_KEY,
      status: txnStatus,
      environment,
      executionMode: "single",
      durationMs,
      request: payload as any,
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
        error: "Phone Risk Score failed",
        providerStatus: res.status,
        providerError:
          typeof providerBody?.error === "string"
            ? providerBody.error
            : providerBody?.data?.status?.description ??
              (typeof providerBody?.raw === "string" ? providerBody.raw : null),
        charged: shouldCharge,
        providerSandbox,
      },
      { status: res.status }
    );
  }

  return NextResponse.json(mapped);
}