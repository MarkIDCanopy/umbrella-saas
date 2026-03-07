// src/app/api/services/full-phone-intelligence/live/route.ts
import { NextResponse } from "next/server";
import { getUmbrellaAccessToken } from "@/lib/umbrella/auth";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  chargeUsageCredits,
  InsufficientCreditsError,
} from "@/lib/billing/chargeUsage";
import { mapFullPhoneIntelligenceTxnResponse } from "@/lib/services/mappers/fullPhoneIntelligence";
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

async function readJsonOrText(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json().catch(() => null);
  const text = await res.text().catch(() => "");
  return text ? { raw: text } : null;
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

function getProviderError(body: any): string | null {
  return (
    (typeof body?.error === "string" ? body.error : null) ??
    (typeof body?.data?.status?.description === "string"
      ? body.data.status.description
      : null) ??
    (typeof body?.status?.description === "string"
      ? body.status.description
      : null)
  );
}

export async function POST(req: Request) {
  const started = Date.now();

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, activeOrgId } = session;
    const env: "live" = "live";
    const orgId = activeOrgId == null ? null : toFiniteInt(activeOrgId);

    const rawPayload = await req.json().catch(() => ({}));
    const safeInput = sanitizePayload(rawPayload);

    if (!safeInput) {
      return NextResponse.json(
        {
          error:
            "Invalid payload. Please provide a valid phone number including country code.",
        },
        { status: 400 }
      );
    }

    const providerPayload = buildProviderPayload(safeInput);
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
          request: safeInput,
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

    const url = `${apiBase.replace(/\/$/, "")}/phone-service/fullPhoneIntelligence`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(providerPayload),
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
          request: safeInput,
          response: {
            error: "Provider unreachable",
            details: err?.message ?? String(err),
            providerSandbox,
          },
        },
      });

      return NextResponse.json(
        {
          error: "Provider unreachable",
          details: err?.message ?? String(err),
        },
        { status: 502 }
      );
    }

    const durationMs = Date.now() - started;
    const body = await readJsonOrText(res);
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
        request: safeInput,
        response: body ?? {},
      },
    });

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
          error: "Full Phone Intelligence failed",
          providerError: getProviderError(body),
          charged: shouldCharge,
          providerStatus: res.status,
          providerSandbox,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(mapFullPhoneIntelligenceTxnResponse(body));
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}