// src/lib/emails/mailer.ts
import "server-only";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require("nodemailer");
import dns from "dns";

export function getTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error("SMTP credentials missing");

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },

    // ✅ Force IPv4 DNS lookup
    lookup: (hostname: string, options: any, cb: any) => {
      dns.lookup(hostname, { family: 4 }, cb);
    },

    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
}

export async function sendVerificationEmail(params: {
  to: string;
  fullName?: string | null;
  verifyUrl: string;
}) {
  const transport = getTransport();

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
  const { to, fullName, verifyUrl } = params;

  const greeting = fullName ? `Hi ${fullName},` : "Hi,";
  const subject = "Verify your Umbrella SaaS email";

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;line-height:1.5">
    <h2 style="margin:0 0 12px 0;">Confirm your email</h2>
    <p style="margin:0 0 16px 0;">${greeting}<br/>
    Please confirm your email to activate your account.</p>
    <p style="margin:0 0 20px 0;">
      <a href="${verifyUrl}" style="display:inline-block;background:#111827;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;">
        Verify email
      </a>
    </p>
    <p style="margin:0;color:#6b7280;font-size:12px;word-break:break-all;">
      ${verifyUrl}
    </p>
  </div>`;

  await transport.sendMail({
    from,
    to,
    subject,
    text: `Verify your email: ${verifyUrl}`,
    html,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  fullName?: string | null;
  resetUrl: string;
}) {
  const transport = getTransport();

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
  const { to, fullName, resetUrl } = params;

  const greeting = fullName ? `Hi ${fullName},` : "Hi,";
  const subject = "Reset your Umbrella SaaS password";

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;line-height:1.5">
    <h2 style="margin:0 0 12px 0;">Reset your password</h2>
    <p style="margin:0 0 16px 0;">${greeting}<br/>
    We received a request to reset your password. If this was you, click below:</p>

    <p style="margin:0 0 20px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:#111827;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;">
        Reset password
      </a>
    </p>

    <p style="margin:0;color:#6b7280;font-size:12px;word-break:break-all;">
      If you didn’t request this, you can ignore this email.<br/>
      ${resetUrl}
    </p>
  </div>`;

  await transport.sendMail({
    from,
    to,
    subject,
    text: `Reset your password: ${resetUrl}`,
    html,
  });
}

/**
 * ✅ Organization invite email
 */
export async function sendOrgInviteEmail(params: {
  to: string;
  fullName?: string | null;
  orgName: string;
  invitedByName?: string | null;
  acceptUrl: string;
}) {
  const transport = getTransport();

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
  const { to, fullName, orgName, invitedByName, acceptUrl } = params;

  const greeting = fullName ? `Hi ${fullName},` : "Hi,";
  const byLine = invitedByName ? `${invitedByName} invited you` : "You were invited";

  const subject = `You’ve been invited to ${orgName}`;

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;line-height:1.5">
    <h2 style="margin:0 0 12px 0;">Join ${orgName}</h2>
    <p style="margin:0 0 16px 0;">${greeting}<br/>
    ${byLine} to join <strong>${orgName}</strong> on Umbrella.</p>

    <p style="margin:0 0 20px 0;">
      <a href="${acceptUrl}" style="display:inline-block;background:#111827;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;">
        Accept invite
      </a>
    </p>

    <p style="margin:0;color:#6b7280;font-size:12px;word-break:break-all;">
      If the button doesn’t work, open this link:<br/>
      ${acceptUrl}
    </p>
  </div>`;

  await transport.sendMail({
    from,
    to,
    subject,
    text: `Accept invite: ${acceptUrl}`,
    html,
  });
}
