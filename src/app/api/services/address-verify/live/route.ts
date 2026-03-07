// src/app/api/services/address-verify/live/route.ts
import { NextResponse } from "next/server";
import { getUmbrellaAccessToken } from "@/lib/umbrella/auth";
import { prisma } from "@/lib/prisma";
import { getSession, updateSession } from "@/lib/session";
import {
  chargeUsageCredits,
  InsufficientCreditsError,
} from "@/lib/billing/chargeUsage";
import { eurToCredits } from "@/lib/billing/pricing";
import { assertSufficientCredits } from "@/lib/billing/assertSufficientCredits";

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

function toFiniteInt(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeJson(v: any, fallback: any = {}) {
  try {
    return JSON.parse(JSON.stringify(v ?? fallback));
  } catch {
    return fallback;
  }
}

async function readTextAndJson(res: Response): Promise<{
  text: string;
  json: any | null;
}> {
  const text = await res.text().catch(() => "");
  let json: any | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { text, json };
}

const SERVICE_KEY = "address-verification";
const TNC_VERSION = "v1";
const GATED_COUNTRIES = new Set(["AT"]);

export async function POST(req: Request) {
  const started = Date.now();
  let stage = "init";

  try {
    stage = "session";
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, activeOrgId } = session;

    stage = "normalize_org";
    const orgId = activeOrgId == null ? null : toFiniteInt(activeOrgId);

    if (activeOrgId != null && orgId == null) {
      await updateSession(session.sessionId, { activeOrgId: null });
    }

    stage = "parse_body";
    const raw = await req.json().catch(() => ({}));
    const { environment, ...payloadRaw } = raw as {
      environment?: "test" | "live";
      [k: string]: any;
    };

    const env: "live" = "live";

    const owner =
      orgId != null
        ? ({ kind: "org", organizationId: orgId, userId } as const)
        : ({ kind: "user", userId } as const);

    const countryCode = normalizeCountry(payloadRaw?.country);

    // 2) Resolve service + per-country pricing
    stage = "load_service";
    const service = await prisma.service.findUnique({
      where: { key: SERVICE_KEY },
      select: { id: true, priceCredits: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not configured" }, { status: 500 });
    }

    stage = "country_price";
    let unitPriceCredits: number | undefined;

    if (countryCode) {
      const row = await prisma.serviceCountryPrice.findFirst({
        where: {
          serviceId: service.id,
          countryCode,
          active: true,
        },
        select: { priceEur: true },
      });

      if (row?.priceEur != null) {
        const credits = eurToCredits(Number(row.priceEur));
        if (Number.isFinite(credits) && credits > 0) unitPriceCredits = credits;
      }
    }

    const fallback = Number(service.priceCredits ?? 0);
    const perUnitCreditsRaw =
      typeof unitPriceCredits === "number" && unitPriceCredits > 0
        ? Math.floor(unitPriceCredits)
        : fallback;

    const perUnitCredits =
      Number.isFinite(perUnitCreditsRaw) && perUnitCreditsRaw > 0
        ? perUnitCreditsRaw
        : 0;

    // 3) Preflight credits before calling provider (LIVE only)
    stage = "preflight";
    if (env === "live" && perUnitCredits > 0) {
      try {
        await assertSufficientCredits({ owner, required: perUnitCredits });
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

    // 3.5) Attach compliance for gated countries (e.g., AT)
    stage = "compliance_attach";
    let payload = payloadRaw;

    if (countryCode && GATED_COUNTRIES.has(countryCode)) {
      const consent = await prisma.complianceConsent.findFirst({
        where:
          owner.kind === "org"
            ? {
                ownerKind: "org",
                organizationId: owner.organizationId,
                key: SERVICE_KEY,
                countryCode,
                tncVersion: TNC_VERSION,
              }
            : {
                ownerKind: "user",
                userId: owner.userId,
                key: SERVICE_KEY,
                countryCode,
                tncVersion: TNC_VERSION,
              },
        select: { acceptedAt: true, reason: true },
      });

      const ok =
        !!consent?.acceptedAt &&
        typeof consent?.reason === "string" &&
        consent.reason.length > 0;

      if (!ok) {
        return NextResponse.json(
          {
            error:
              `Missing compliance confirmation for ${countryCode}. ` +
              `Please accept terms and provide a reason.`,
            code: "COMPLIANCE_REQUIRED",
            gateUrl:
              `/dashboard/services/address-verification/gate?key=${encodeURIComponent(
                SERVICE_KEY
              )}&country=${encodeURIComponent(countryCode)}&tncVersion=${encodeURIComponent(
                TNC_VERSION
              )}`,
            charged: false,
          },
          { status: 400 }
        );
      }

      // Attach to provider payload (matches what you already modeled in bulk)
      payload = {
        ...payloadRaw,
        compliance: {
          acceptedTerms: true,
          reason: consent!.reason,
        },
      };
    }

    // 4) Provider auth
    stage = "provider_auth";
    const providerSandbox = process.env.NODE_ENV !== "production";
    const token = await getUmbrellaAccessToken({ sandbox: providerSandbox });

    stage = "provider_base";
    const apiBase = providerSandbox
      ? process.env.UMBRELLA_API_BASE_SANDBOX || process.env.UMBRELLA_API_BASE
      : process.env.UMBRELLA_API_BASE || process.env.UMBRELLA_API_BASE_SANDBOX;

    if (!apiBase) {
      return NextResponse.json(
        { error: "Umbrella API base URL not configured" },
        { status: 500 }
      );
    }

    const verifyUrl = `${apiBase.replace(/\/$/, "")}/address/verify`;

    // 5) Call provider
    stage = "provider_call";
    let res: Response;
    try {
      res = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          // Optional but useful for provider-side logs:
          "X-Umbrella-Client": "umbrella-cloud",
        },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      stage = "provider_unreachable_log";
      const durationMs = Date.now() - started;

      await prisma.transaction.create({
        data: {
          userId,
          organizationId: orgId ?? null,
          service: SERVICE_KEY,
          status: "ERROR",
          environment: env,
          executionMode: "single",
          durationMs,
          request: safeJson(payload, {}),
          response: safeJson(
            { error: "Provider unreachable", details: err?.message ?? String(err) },
            {}
          ),
        },
      });

      return NextResponse.json(
        { error: "Provider unreachable", details: err?.message ?? String(err) },
        { status: 502 }
      );
    }

    stage = "provider_read_body";
    const durationMs = Date.now() - started;

    // ALWAYS keep raw text for debugging
    const { text: providerText, json: providerJson } = await readTextAndJson(res);

    const providerBody = providerJson ?? (providerText ? { error: providerText } : null);

    const status = res.ok
      ? normalizeStatus((providerJson as any)?.globalResult?.overall)
      : res.status >= 500
      ? "ERROR"
      : "NOK";

    // 6) Persist transaction
    stage = "db_txn_create";
    const txn = await prisma.transaction.create({
      data: {
        userId,
        organizationId: orgId ?? null,
        service: SERVICE_KEY,
        status,
        environment: env,
        executionMode: "single",
        durationMs,
        request: safeJson(payload, {}),
        response: safeJson(providerBody, {}),
      },
    });

    // 7) Charge for 2xx + 4xx, don't charge for 5xx
    stage = "billing_charge_decide";
    const shouldCharge = res.ok;

    if (shouldCharge && perUnitCredits > 0) {
      stage = "billing_charge";
      try {
        await chargeUsageCredits({
          owner,
          serviceKey: SERVICE_KEY,
          units: 1,
          environment: env,
          umbrellaTxnIds: [String(txn.id)],
          ...(unitPriceCredits ? { unitPriceCredits } : {}),
        });
      } catch (e: any) {
        if (e instanceof InsufficientCreditsError) {
          stage = "billing_race_cleanup";
          try {
            await prisma.transaction.delete({ where: { id: txn.id } });
          } catch {}

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

    // provider non-OK
    if (!res.ok) {
      stage = "provider_not_ok_return";
      return NextResponse.json(
        {
          error: "Verification failed",
          providerStatus: res.status,
          providerError:
            (providerJson as any)?.error ??
            (providerJson as any)?.message ??
            null,
          // THIS is the missing piece for you right now:
          providerRaw: providerText || null,
          verifyUrl,
          charged: shouldCharge,
          providerSandbox,
        },
        { status: res.status }
      );
    }

    stage = "success_return";
    return NextResponse.json(providerJson ?? providerBody ?? {});
  } catch (e: any) {
    console.error("ADDRESS VERIFY LIVE ERROR:", { stage, error: e });

    const isProd = process.env.NODE_ENV === "production";
    return NextResponse.json(
      {
        error: "Server error",
        ...(isProd
          ? {}
          : {
              stage,
              message: e?.message ?? String(e),
              code: e?.code ?? null,
              meta: e?.meta ?? null,
            }),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}