// src/app/api/organizations/members/invite/accept/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession, updateSession } from "@/lib/session";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = String(body.token ?? "").trim();

  if (!token || token.length < 20) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const tokenHash = sha256(token);
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invite = await tx.organizationInviteToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          memberId: true,
          expiresAt: true,
          usedAt: true,
          member: {
            select: {
              id: true,
              organizationId: true,
              email: true,
              status: true,
              role: true,
              userId: true,
              organization: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!invite || !invite.member) {
        return { ok: false as const, code: "NOT_FOUND" as const };
      }

      if (invite.usedAt) {
        return { ok: false as const, code: "USED" as const };
      }

      if (invite.expiresAt <= now) {
        return { ok: false as const, code: "EXPIRED" as const };
      }

      // ✅ Ensure this invite is accepted by the logged-in email
      const me = await tx.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true },
      });

      if (!me) {
        return { ok: false as const, code: "UNAUTHORIZED" as const };
      }

      const invitedEmail = String(invite.member.email).trim().toLowerCase();
      const myEmail = String(me.email).trim().toLowerCase();

      if (invitedEmail !== myEmail) {
        return { ok: false as const, code: "EMAIL_MISMATCH" as const };
      }

      // ✅ Activate membership (idempotent: ok if already active)
      const updatedMember = await tx.organizationMember.update({
        where: { id: invite.member.id },
        data: {
          userId: me.id,
          status: "active",
          joinedAt: now,
        },
        select: {
          id: true,
          organizationId: true,
          role: true,
          status: true,
          organization: { select: { id: true, name: true } },
        },
      });

      // ✅ Mark token used
      await tx.organizationInviteToken.update({
        where: { id: invite.id },
        data: { usedAt: now },
      });

      return {
        ok: true as const,
        organizationId: updatedMember.organizationId,
        orgName: updatedMember.organization.name,
        role: updatedMember.role,
      };
    });

    if (!result.ok) {
      const map: Record<string, { status: number; msg: string }> = {
        NOT_FOUND: { status: 404, msg: "Invite not found." },
        USED: { status: 400, msg: "This invite link was already used." },
        EXPIRED: { status: 400, msg: "This invite link has expired." },
        EMAIL_MISMATCH: {
          status: 403,
          msg: "This invite was sent to a different email. Please log in with the invited email.",
        },
        UNAUTHORIZED: { status: 401, msg: "Unauthorized." },
      };

      const m = map[(result as any).code] ?? {
        status: 400,
        msg: "Could not accept invite.",
      };

      return NextResponse.json({ error: m.msg }, { status: m.status });
    }

    // ✅ Switch workspace immediately
    await updateSession(session.sessionId, {
      activeOrgId: Number(result.organizationId),
    });

    return NextResponse.json({
      success: true,
      organizationId: result.organizationId,
      orgName: result.orgName,
      role: result.role,
    });
  } catch (e) {
    console.error("INVITE ACCEPT ERROR:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
