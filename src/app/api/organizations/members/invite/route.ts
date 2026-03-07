// src/app/api/organizations/members/invite/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sendOrgInviteEmail } from "@/lib/emails/mailer";

const INVITE_TTL_DAYS = 7;

type Role = "owner" | "admin" | "user";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getAppUrl(req: Request) {
  const env =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_URL;

  if (env) {
    if (env.startsWith("http://") || env.startsWith("https://")) return env;
    return `https://${env}`;
  }

  const origin = req.headers.get("origin");
  if (origin) return origin;

  return "http://localhost:3000";
}

function isRole(v: any): v is Role {
  return v === "owner" || v === "admin" || v === "user";
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.activeOrgId) {
    return NextResponse.json({ error: "No active organization." }, { status: 400 });
  }

  const orgId = Number(session.activeOrgId);
  if (!Number.isFinite(orgId)) {
    return NextResponse.json({ error: "Invalid organization id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    role?: Role | "viewer";
  };

  const email = String(body.email ?? "").trim().toLowerCase();
  const name = typeof body.name === "string" ? body.name.trim() : null;
  const roleRaw = body.role;

  if (!email || email.length < 5) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }
  if (!isRole(roleRaw)) {
    // viewer or invalid roles rejected
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  const role: Role = roleRaw;

  // ✅ Permission check: must be active owner/admin
  const inviter = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: session.userId,
      status: "active",
      role: { in: ["owner", "admin"] },
    },
    select: { role: true },
  });

  if (!inviter) {
    return NextResponse.json(
      { error: "You are not allowed to invite members." },
      { status: 403 }
    );
  }

  // ✅ Only owner can invite another owner
  if (role === "owner" && inviter.role !== "owner") {
    return NextResponse.json(
      { error: "Only an owner can invite another owner." },
      { status: 403 }
    );
  }

  try {
    const appUrl = getAppUrl(req);

    const [org, inviterUser] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true },
      }),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { fullName: true, email: true },
      }),
    ]);

    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, fullName: true },
    });

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    const result = await prisma.$transaction(async (tx) => {
      let member = await tx.organizationMember.findFirst({
        where: { organizationId: orgId, email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          userId: true,
        },
      });

      if (!member) {
        member = await tx.organizationMember.create({
          data: {
            organizationId: orgId,
            email,
            name: name || null,
            role,
            status: "invited",
            invitedBy: session.userId,
            userId: existingUser?.id ?? null,
            invitedAt: now,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            userId: true,
          },
        });
      } else {
        // already active => do not re-invite
        if (member.status === "active") {
          return { member, tokenPlain: null as string | null };
        }

        member = await tx.organizationMember.update({
          where: { id: member.id },
          data: {
            role,
            name: name || member.name,
            userId: existingUser?.id ?? member.userId,
            status: "invited",
            invitedBy: session.userId,
            invitedAt: now,
            joinedAt: null,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            userId: true,
          },
        });
      }

      const tokenPlain = crypto.randomBytes(32).toString("hex");
      const tokenHash = sha256(tokenPlain);

      await tx.organizationInviteToken.upsert({
        where: { memberId: member.id },
        update: {
          tokenHash,
          expiresAt,
          usedAt: null,
          createdAt: now,
        },
        create: {
          memberId: member.id,
          tokenHash,
          expiresAt,
        },
      });

      return { member, tokenPlain };
    });

    if (!result.tokenPlain) {
      return NextResponse.json({
        member: result.member,
        info: "User is already an active member.",
      });
    }

    const acceptUrl = `${appUrl}/invite/accept?token=${encodeURIComponent(
      result.tokenPlain
    )}`;

    await sendOrgInviteEmail({
      to: email,
      fullName: name || existingUser?.fullName || null,
      orgName: org.name,
      invitedByName: inviterUser?.fullName || inviterUser?.email || null,
      acceptUrl,
    });

    return NextResponse.json({ member: result.member });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "This email is already invited to the organization." },
        { status: 400 }
      );
    }

    console.error("Invite error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}