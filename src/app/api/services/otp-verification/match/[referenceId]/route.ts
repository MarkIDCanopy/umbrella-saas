// src/app/api/services/otp-verification/match/[referenceId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getUmbrellaAccessToken } from "@/lib/umbrella/auth";
import {
  mapOtpMatchResponse,
  extractOtpProviderError,
} from "@/lib/services/mappers/otpVerification";
import {
  cleanOtpCode,
  cleanReferenceId,
} from "@/lib/input-safeguards"; // adjust path if needed

const SERVICE_KEY = "otp-verification";

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

export async function PATCH(
  req: Request,
  { params }: { params: { referenceId: string } }
) {
  const started = Date.now();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, activeOrgId } = session;
  const orgId = activeOrgId == null ? null : toFiniteInt(activeOrgId);
  const environment: "live" = "live";

  const referenceId = cleanReferenceId(
    decodeURIComponent(params.referenceId || "").trim()
  );

  if (!referenceId) {
    return NextResponse.json(
      { error: "Missing referenceId in route params" },
      { status: 400 }
    );
  }

  const raw = (await req.json().catch(() => ({}))) as {
    securityFactor?: string;
  };

  const securityFactor =
    typeof raw.securityFactor === "string"
      ? cleanOtpCode(raw.securityFactor)
      : "";

  if (!/^\d{3,10}$/.test(securityFactor)) {
    return NextResponse.json(
      { error: "securityFactor must be numeric and 3-10 digits long" },
      { status: 400 }
    );
  }

  const payload = { securityFactor };

  const requestForStorage = {
    operation: "match-verification",
    referenceId,
    securityFactor: maskOtp(securityFactor),
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

  const url = `${apiBase.replace(/\/$/, "")}/phone-service/verification/${encodeURIComponent(referenceId)}`;

  let res: Response;
  let providerBody: any = null;

  try {
    res = await fetch(url, {
      method: "PATCH",
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
  const mapped = mapOtpMatchResponse(providerBody, referenceId);

  const txnStatus: "OK" | "NOK" | "ERROR" | "REVIEW" =
    mapped.verified
      ? "OK"
      : res.ok
      ? "NOK"
      : res.status >= 500
      ? "ERROR"
      : "NOK";

  await prisma.transaction.create({
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

  if (!res.ok) {
    return NextResponse.json(
      {
        ...mapped,
        error: "OTP verification failed",
        providerStatus: res.status,
        providerError: extractOtpProviderError(providerBody),
        providerSandbox,
      },
      { status: res.status }
    );
  }

  return NextResponse.json(mapped);
}