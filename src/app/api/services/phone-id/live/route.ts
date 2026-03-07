// src/app/api/services/phone-id/live/route.ts
import { NextResponse } from "next/server";
import { getUmbrellaAccessToken } from "@/lib/umbrella/auth";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  chargeUsageCredits,
  InsufficientCreditsError,
} from "@/lib/billing/chargeUsage";
import { mapPhoneIdTxnResponse } from "@/lib/services/mappers/phoneId";
import {
  cleanAddressLine,
  cleanCity,
  cleanCountryFlexible,
  cleanEmail,
  cleanExternalId,
  cleanName,
  cleanPhoneInput,
  cleanPostalCode,
  cleanState,
  normalizePhoneNumberForProvider,
} from "@/lib/input-safeguards";

const SERVICE_KEY = "phone-id";

type SafePayload = {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  state: string;

  externalId?: string;
  contactEmail?: string;

  includeContactInfo?: boolean;
  includeBreachedData?: boolean;
  includeCallForwardDetection?: boolean;
  includeSubscriberStatus?: boolean;
  includePortingStatus?: boolean;
  includeSimSwap?: boolean;
  includeNumberDeactivation?: boolean;

  portingHistoryPastXDays?: string;
  ageThreshold?: string;

  consentConfirmed?: boolean;
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

function extractClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return null;
}

function requiresConsent(input: SafePayload) {
  return Boolean(input.includeContactInfo || input.contactEmail || input.ageThreshold);
}

function sanitizePayload(raw: any): SafePayload | null {
  const phone = cleanPhoneInput(String(raw?.phoneNumber ?? ""));
  if (!phone || phone.replace(/\D/g, "").length < 8) return null;

  const firstName = cleanName(String(raw?.firstName ?? ""));
  const lastName = cleanName(String(raw?.lastName ?? ""));
  const address = cleanAddressLine(String(raw?.address ?? ""));
  const city = cleanCity(String(raw?.city ?? ""));
  const postalCode = cleanPostalCode(String(raw?.postalCode ?? ""));
  const country = cleanCountryFlexible(String(raw?.country ?? ""));
  const state = cleanState(String(raw?.state ?? ""));

  if (
    !firstName ||
    !lastName ||
    !address ||
    !city ||
    !postalCode ||
    !country ||
    !state
  ) {
    return null;
  }

  const out: SafePayload = {
    phoneNumber: phone,
    firstName,
    lastName,
    address,
    city,
    postalCode,
    country,
    state,
  };

  if (typeof raw?.externalId === "string" && raw.externalId.trim()) {
    out.externalId = cleanExternalId(raw.externalId);
  }

  if (typeof raw?.contactEmail === "string" && raw.contactEmail.trim()) {
    out.contactEmail = cleanEmail(raw.contactEmail);
  }

  if (raw?.includeContactInfo != null) {
    out.includeContactInfo = Boolean(raw.includeContactInfo);
  }
  if (raw?.includeBreachedData != null) {
    out.includeBreachedData = Boolean(raw.includeBreachedData);
  }
  if (raw?.includeCallForwardDetection != null) {
    out.includeCallForwardDetection = Boolean(raw.includeCallForwardDetection);
  }
  if (raw?.includeSubscriberStatus != null) {
    out.includeSubscriberStatus = Boolean(raw.includeSubscriberStatus);
  }
  if (raw?.includePortingStatus != null) {
    out.includePortingStatus = Boolean(raw.includePortingStatus);
  }
  if (raw?.includeSimSwap != null) {
    out.includeSimSwap = Boolean(raw.includeSimSwap);
  }
  if (raw?.includeNumberDeactivation != null) {
    out.includeNumberDeactivation = Boolean(raw.includeNumberDeactivation);
  }

  if (
    typeof raw?.portingHistoryPastXDays === "string" &&
    raw.portingHistoryPastXDays.trim()
  ) {
    const n = Number(raw.portingHistoryPastXDays);
    if (!Number.isInteger(n) || n < 1 || n > 3650) return null;
    out.portingHistoryPastXDays = String(n);
  }

  if (typeof raw?.ageThreshold === "string" && raw.ageThreshold.trim()) {
    const n = Number(raw.ageThreshold);
    if (!Number.isInteger(n) || n < 1 || n > 120) return null;
    out.ageThreshold = String(n);
  }

  if (raw?.consentConfirmed != null) {
    out.consentConfirmed = Boolean(raw.consentConfirmed);
  }

  if (requiresConsent(out) && !out.consentConfirmed) {
    return null;
  }

  return out;
}

function buildProviderPayload(input: SafePayload, originatingIp: string | null) {
  const payload: any = {
    phoneNumber: normalizePhoneNumberForProvider(input.phoneNumber),
    accountLifecycleEvent: "transact",
  };

  if (input.externalId) payload.externalId = input.externalId;
  if (originatingIp) payload.originatingIp = originatingIp;

  const addons: Record<string, any> = {};

  addons.contactMatch = {
    firstName: input.firstName,
    lastName: input.lastName,
    address: input.address,
    city: input.city,
    postalCode: input.postalCode,
    state: input.state,
    country: input.country,
    inputUsed: input.contactEmail ? "phoneNumber and email" : "phoneNumber",
  };

  if (input.includeContactInfo) {
    addons.contact = {
      ...(input.contactEmail ? { email: input.contactEmail } : {}),
    };
  }

  if (input.includeBreachedData) addons.breachedData = {};
  if (input.includeCallForwardDetection) addons.callForwardDetection = {};
  if (input.includeSubscriberStatus) addons.subscriberStatus = {};
  if (input.includePortingStatus) addons.portingStatus = {};
  if (input.includeSimSwap) addons.simSwap = {};
  if (input.includeNumberDeactivation) addons.numberDeactivation = {};

  if (input.portingHistoryPastXDays) {
    addons.portingHistory = {
      pastXDays: Number(input.portingHistoryPastXDays),
    };
  }

  if (input.ageThreshold) {
    addons.ageVerify = {
      ageThreshold: Number(input.ageThreshold),
    };
  }

  payload.addons = addons;

  if (requiresConsent(input)) {
    payload.consent = {
      method: 4,
      timestamp: new Date().toISOString(),
    };
  }

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
            "Invalid payload. Check phone number, required contact match fields, conditional fields, and consent confirmation.",
        },
        { status: 400 }
      );
    }

    const providerPayload = buildProviderPayload(
      safeInput,
      extractClientIp(req)
    );

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

    const url = `${apiBase.replace(/\/$/, "")}/phone-service/phoneid`;

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
        { error: "Provider unreachable", details: err?.message ?? String(err) },
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
          error: "Phone ID failed",
          providerError: getProviderError(body),
          charged: shouldCharge,
          providerStatus: res.status,
          providerSandbox,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(mapPhoneIdTxnResponse(body));
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}