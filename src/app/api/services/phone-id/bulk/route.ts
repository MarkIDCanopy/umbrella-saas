// src/app/api/services/phone-id/bulk/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getUmbrellaAccessToken } from "@/lib/umbrella/auth";
import {
  chargeUsageCredits,
  InsufficientCreditsError,
} from "@/lib/billing/chargeUsage";
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

async function readJsonOrNull(res: Response) {
  return await res.json().catch(() => null);
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

  if (raw?.includeContactInfo != null) out.includeContactInfo = Boolean(raw.includeContactInfo);
  if (raw?.includeBreachedData != null) out.includeBreachedData = Boolean(raw.includeBreachedData);
  if (raw?.includeCallForwardDetection != null) out.includeCallForwardDetection = Boolean(raw.includeCallForwardDetection);
  if (raw?.includeSubscriberStatus != null) out.includeSubscriberStatus = Boolean(raw.includeSubscriberStatus);
  if (raw?.includePortingStatus != null) out.includePortingStatus = Boolean(raw.includePortingStatus);
  if (raw?.includeSimSwap != null) out.includeSimSwap = Boolean(raw.includeSimSwap);
  if (raw?.includeNumberDeactivation != null) out.includeNumberDeactivation = Boolean(raw.includeNumberDeactivation);

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

  if (raw?.consentConfirmed != null) out.consentConfirmed = Boolean(raw.consentConfirmed);

  if (requiresConsent(out) && !out.consentConfirmed) return null;

  return out;
}

function buildProviderPayload(input: SafePayload) {
  const payload: any = {
    phoneNumber: normalizePhoneNumberForProvider(input.phoneNumber),
    accountLifecycleEvent: "transact",
  };

  if (input.externalId) payload.externalId = input.externalId;

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
          "One or more items are invalid. Check required contact match fields, conditional fields, and consent confirmation.",
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

  const url = `${apiBase.replace(/\/$/, "")}/phone-service/phoneid`;

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