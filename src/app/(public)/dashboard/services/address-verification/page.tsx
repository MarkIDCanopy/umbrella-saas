// src/app/(public)/dashboard/services/address-verification/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import AddressVerificationClient from "./AddressVerificationClient";

const SERVICE_KEY = "address-verification";
const TNC_VERSION = "v1";
const GATED_COUNTRIES = new Set(["AT"]);

function norm(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

async function getGatedCountryForUser(userId: number): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { country: true },
  });
  const cc = norm(u?.country);
  return GATED_COUNTRIES.has(cc) ? cc : null;
}

export default async function AddressVerificationPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const gatedCountry = await getGatedCountryForUser(session.userId);

  if (gatedCountry) {
    // decide gating owner based on activeOrgId
    const owner =
      session.activeOrgId != null
        ? ({ kind: "org", organizationId: Number(session.activeOrgId) } as const)
        : ({ kind: "user", userId: session.userId } as const);

    // safety: if org workspace but membership is not active, fall back to personal gating
    if (owner.kind === "org") {
      const ok = await prisma.organizationMember.findFirst({
        where: {
          organizationId: owner.organizationId,
          userId: session.userId,
          status: "active",
        },
        select: { id: true },
      });

      if (!ok) {
        // treat as personal gating
        const existingPersonal = await prisma.complianceConsent.findFirst({
          where: {
            ownerKind: "user",
            userId: session.userId,
            key: SERVICE_KEY,
            countryCode: gatedCountry,
            tncVersion: TNC_VERSION,
          },
          select: { id: true },
        });

        if (!existingPersonal) {
          redirect(
            `/dashboard/services/address-verification/gate?key=${encodeURIComponent(
              SERVICE_KEY
            )}&country=${encodeURIComponent(
              gatedCountry
            )}&tncVersion=${encodeURIComponent(TNC_VERSION)}`
          );
        }

        return <AddressVerificationClient />;
      }
    }

    const existing = await prisma.complianceConsent.findFirst({
      where:
        owner.kind === "org"
          ? {
              ownerKind: "org",
              organizationId: owner.organizationId,
              key: SERVICE_KEY,
              countryCode: gatedCountry,
              tncVersion: TNC_VERSION,
            }
          : {
              ownerKind: "user",
              userId: owner.userId,
              key: SERVICE_KEY,
              countryCode: gatedCountry,
              tncVersion: TNC_VERSION,
            },
      select: { id: true },
    });

    if (!existing) {
      redirect(
        `/dashboard/services/address-verification/gate?key=${encodeURIComponent(
          SERVICE_KEY
        )}&country=${encodeURIComponent(
          gatedCountry
        )}&tncVersion=${encodeURIComponent(TNC_VERSION)}`
      );
    }
  }

  return <AddressVerificationClient />;
}