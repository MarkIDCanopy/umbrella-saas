// src/lib/emails/admin/password-reset-email.ts
import "server-only";

import { getTransport } from "@/lib/emails/mailer";

export async function sendAdminPasswordResetEmail(params: {
  to: string;
  fullName?: string | null;
  resetUrl: string;
}) {
  const transport = getTransport();

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
  const { to, fullName, resetUrl } = params;

  const greeting = fullName ? `Hi ${fullName},` : "Hi,";
  const subject = "Set up your ID Canopy admin console password";

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;line-height:1.5">
    <h2 style="margin:0 0 12px 0;">Admin console access</h2>
    <p style="margin:0 0 16px 0;">${greeting}<br/>
    You were granted access to the ID Canopy admin console. Set your password below:</p>

    <p style="margin:0 0 20px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:#111827;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;">
        Set password
      </a>
    </p>

    <p style="margin:0;color:#6b7280;font-size:12px;word-break:break-all;">
      If you were not expecting this, please contact the administrator.<br/>
      ${resetUrl}
    </p>
  </div>`;

  await transport.sendMail({
    from,
    to,
    subject,
    text: `Set your admin console password: ${resetUrl}`,
    html,
  });
}