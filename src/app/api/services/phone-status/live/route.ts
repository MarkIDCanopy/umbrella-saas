// src/app/api/services/phone-status/live/route.ts
import { NextResponse } from "next/server";
import { getUmbrellaAccessToken } from "@/lib/umbrella/auth";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
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

async function readJsonOrText(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json().catch(() => null);
  const text = await res.text().catch(() => "");
  return text ? { raw: text } : null;
}

function mapProviderResponse(raw: any) {
  return {
    referenceId: raw?.reference_id,
    status: raw?.status,
    phoneType: raw?.phone_type?.description,
    carrier: raw?.carrier?.name,
    subscriberStatus: raw?.live?.subscriber_status,
    deviceStatus: raw?.live?.device_status,
    roaming: raw?.live?.roaming,
    location: {
      country: raw?.location?.country?.name,
      city: raw?.location?.city,
    },
  };
}

export async function POST(req: Request) {
  const started = Date.now();

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, activeOrgId } = session;

    // ✅ LIVE route is LIVE-only in your billing system
    const env: "live" = "live";

    // ✅ normalize org id (avoid string/garbage)
    const orgId = activeOrgId == null ? null : toFiniteInt(activeOrgId);

    // payload
    const payload = (await req.json().catch(() => ({}))) as {
      phoneNumber?: string;
      [k: string]: any;
    };

    if (typeof payload?.phoneNumber !== "string" || payload.phoneNumber.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: expected { phoneNumber: string }" },
        { status: 400 }
      );
    }

    // ✅ Provider sandbox in dev, live in prod
    const providerSandbox = process.env.NODE_ENV !== "production";

    let token: string;
    try {
      token = await getUmbrellaAccessToken({ sandbox: providerSandbox });
    } catch (err: any) {
      await prisma.transaction.create({
        data: {
          userId,
          organizationId: orgId ?? null,
          service: SERVICE_KEY,
          status: "ERROR",
          environment: env,
          executionMode: "single",
          durationMs: Date.now() - started,
          request: payload ?? {},
          response: {
            error: "Provider auth failed",
            details: err?.message ?? String(err),
            providerSandbox,
          },
        },
      });

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

    const url = `${apiBase.replace(/\/$/, "")}/phone-service/phoneStatus`;

    // provider call
    let res: Response;
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
    } catch (err: any) {
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
          request: payload ?? {},
          response: {
            error: "Provider unreachable",
            details: err?.message ?? String(err),
            providerSandbox,
          },
        },
      });

      return NextResponse.json(
        { error: "Provider unreachable", details: err?.message ?? String(err) },
        { status: 502 }
      );
    }

    const durationMs = Date.now() - started;
    const body = await readJsonOrText(res);

    // ✅ status reflects provider payload status.code (same as bulk)
    const status = normalizeProviderStatus(body);

    const txn = await prisma.transaction.create({
      data: {
        userId,
        organizationId: orgId ?? null,
        service: SERVICE_KEY,
        status,
        environment: env,
        executionMode: "single",
        durationMs,
        request: payload ?? {},
        response: body ?? {},
      },
    });

    // charge 2xx + 4xx, don't charge 5xx
    const shouldCharge = res.ok;

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
          environment: env,
          umbrellaTxnIds: [String(txn.id)], // ✅ always string
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
          error: "Phone status failed",
          providerError:
            typeof body?.error === "string"
              ? body.error
              : body?.status?.description
              ? body.status.description
              : null,
          charged: shouldCharge,
          providerStatus: res.status,
          providerSandbox,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(mapProviderResponse(body));
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}