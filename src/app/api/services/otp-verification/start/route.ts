// src/app/api/services/otp-verification/start/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getUmbrellaAccessToken } from "@/lib/umbrella/auth";
import {
  chargeUsageCredits,
  InsufficientCreditsError,
} from "@/lib/billing/chargeUsage";
import {
  mapOtpStartResponse,
  extractOtpProviderError,
  type OtpMethod,
} from "@/lib/services/mappers/otpVerification";
import {
  cleanEmail,
  normalizePhoneNumberForProvider,
  cleanExternalId,
  cleanOtpCode,
} from "@/lib/input-safeguards"; // adjust path if needed

const SERVICE_KEY = "otp-verification";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toFiniteInt(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function maskOtp(value?: string | null) {
  if (!value) return undefined;
  return "*".repeat(Math.min(value.length, 10));
}

async function readJsonOrText(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await res.json().catch(() => null);
  }
  const text = await res.text().catch(() => "");
  return text ? { raw: text } : null;
}

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
    method?: OtpMethod;
    phoneNumber?: string;
    email?: string;
    externalId?: string;
    securityFactor?: string;
  };

  const method = raw.method === "sms" || raw.method === "email" ? raw.method : null;

  if (!method) {
    return NextResponse.json(
      { error: 'Invalid payload: expected method to be "sms" or "email"' },
      { status: 400 }
    );
  }

  const operation =
    method === "sms" ? "sms-verification" : "email-verification";

  const phoneNumber =
    typeof raw.phoneNumber === "string"
      ? normalizePhoneNumberForProvider(raw.phoneNumber)
      : "";

  const email =
    typeof raw.email === "string"
      ? cleanEmail(raw.email)
      : "";

  if (method === "sms" && !phoneNumber) {
    return NextResponse.json(
      { error: "Invalid payload: phoneNumber is required for SMS verification" },
      { status: 400 }
    );
  }

  if (method === "email" && !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Invalid payload: a valid email is required for email verification" },
      { status: 400 }
    );
  }

  let securityFactor: string | undefined;
  if (typeof raw.securityFactor === "string" && raw.securityFactor.trim()) {
    const cleanedOtp = cleanOtpCode(raw.securityFactor);
    if (!/^\d{3,10}$/.test(cleanedOtp)) {
      return NextResponse.json(
        { error: "securityFactor must be numeric and 3-10 digits long" },
        { status: 400 }
      );
    }
    securityFactor = cleanedOtp;
  }

  const externalIdRaw =
    typeof raw.externalId === "string" && raw.externalId.trim()
      ? cleanExternalId(raw.externalId)
      : "";

  const externalId = externalIdRaw || undefined;

  const payload = {
    method,
    ...(method === "sms" ? { phoneNumber } : { email }),
    ...(externalId ? { externalId } : {}),
    ...(securityFactor ? { securityFactor } : {}),
  };

  const requestForStorage = {
    operation,
    ...payload,
    ...(securityFactor ? { securityFactor: maskOtp(securityFactor) } : {}),
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

  const url = `${apiBase.replace(/\/$/, "")}/phone-service/verification`;

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
        request: requestForStorage as any,
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
  const mapped = mapOtpStartResponse(providerBody);

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
      request: requestForStorage as any,
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
        ...mapped,
        error: "Verification start failed",
        providerStatus: res.status,
        providerError: extractOtpProviderError(providerBody),
        charged: shouldCharge,
        providerSandbox,
      },
      { status: res.status }
    );
  }

  return NextResponse.json(mapped);
}