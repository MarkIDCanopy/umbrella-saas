import { type NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";

export async function POST(request: NextRequest) {
  try {
    const { sender, recipient, message, subject } = await request.json();

    if (!sender || !recipient || !message || !subject) {
      return NextResponse.json(
        { error: "Missing sender, recipient, subject, or message." },
        { status: 400 }
      );
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json(
        { error: "SMTP credentials are not configured." },
        { status: 500 }
      );
    }

    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // App Password
      },
    });

    const mailOptions: Mail.Options = {
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER, // your SaaS mailbox
      to: recipient,
      subject,
      text: message,
      html: `<p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>`,
      replyTo: sender, // so you can reply to the user
    };

    await transport.sendMail(mailOptions);

    return NextResponse.json({ message: "Request sent" });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}

// minimal HTML escaping to avoid injection in the email body
function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
