import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function normalizeCC(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

// Add more any time:
const GATED_COUNTRIES = new Set(["AT"]); // later: new Set(["AT","DE"])

async function isRequiredForUser(userId: number, countryCode: string) {
  const cc = normalizeCC(countryCode);
  if (!GATED_COUNTRIES.has(cc)) return false;

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { country: true },
  });

  return normalizeCC(u?.country) === cc;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const key = String(url.searchParams.get("key") ?? "").trim();
  const countryCode = normalizeCC(url.searchParams.get("country"));
  const tncVersion = String(url.searchParams.get("tncVersion") ?? "v1").trim();

  if (!key || !countryCode) {
    return NextResponse.json({ error: "Missing key or country" }, { status: 400 });
  }

  const required = await isRequiredForUser(session.userId, countryCode);

  if (!required) {
    // Not required => treat as accepted
    return NextResponse.json({ required: false, accepted: true });
  }

  const owner =
    session.activeOrgId
      ? ({ kind: "org", organizationId: session.activeOrgId } as const)
      : ({ kind: "user", userId: session.userId } as const);

  const existing = await prisma.complianceConsent.findFirst({
    where:
      owner.kind === "org"
        ? {
            ownerKind: "org",
            organizationId: owner.organizationId,
            key,
            countryCode,
            tncVersion,
          }
        : {
            ownerKind: "user",
            userId: owner.userId,
            key,
            countryCode,
            tncVersion,
          },
    select: { id: true, acceptedAt: true, reason: true },
  });

  return NextResponse.json({
    required: true,
    accepted: Boolean(existing),
    acceptedAt: existing?.acceptedAt ?? null,
    reason: existing?.reason ?? null,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const key = String(body?.key ?? "").trim();
  const countryCode = normalizeCC(body?.countryCode);
  const tncVersion = String(body?.tncVersion ?? "v1").trim();

  const acceptedTerms = body?.acceptedTerms === true;
  const reason = String(body?.reason ?? "").trim();

  if (!key || !countryCode) {
    return NextResponse.json({ error: "Missing key or countryCode" }, { status: 400 });
  }

  const required = await isRequiredForUser(session.userId, countryCode);

  if (!required) {
    return NextResponse.json({ success: true, stored: false });
  }

  if (!acceptedTerms || !reason) {
    return NextResponse.json(
      { error: "Must accept terms and provide a reason" },
      { status: 400 }
    );
  }

  const owner =
    session.activeOrgId
      ? ({ kind: "org", organizationId: session.activeOrgId } as const)
      : ({ kind: "user", userId: session.userId } as const);

  const existing = await prisma.complianceConsent.findFirst({
    where:
      owner.kind === "org"
        ? {
            ownerKind: "org",
            organizationId: owner.organizationId,
            key,
            countryCode,
            tncVersion,
          }
        : {
            ownerKind: "user",
            userId: owner.userId,
            key,
            countryCode,
            tncVersion,
          },
    select: { id: true },
  });

  if (existing) {
    await prisma.complianceConsent.update({
      where: { id: existing.id },
      data: {
        acceptedAt: new Date(),
        reason,
      },
    });
  } else {
    await prisma.complianceConsent.create({
      data:
        owner.kind === "org"
          ? {
              ownerKind: "org",
              organizationId: owner.organizationId,
              userId: null,
              key,
              countryCode,
              tncVersion,
              reason,
              acceptedAt: new Date(),
            }
          : {
              ownerKind: "user",
              userId: owner.userId,
              organizationId: null,
              key,
              countryCode,
              tncVersion,
              reason,
              acceptedAt: new Date(),
            },
    });
  }

  return NextResponse.json({ success: true, stored: true });
}
