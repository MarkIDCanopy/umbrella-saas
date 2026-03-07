// src/app/(public)/verify-email/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useSearchParams();

  const token = params.get("token");
  const email = params.get("email");
  const emailSentParam = params.get("emailSent"); // "1" | "0" | null

  const hasToken = useMemo(() => Boolean(token), [token]);

  const [status, setStatus] = useState<
    "idle" | "verifying" | "verified" | "error"
  >("idle");
  const [error, setError] = useState("");

  const [resendStatus, setResendStatus] = useState<
    "idle" | "sending" | "sent" | "failed"
  >("idle");
  const [resendMsg, setResendMsg] = useState("");

  // If token present, verify immediately
  useEffect(() => {
    if (!token) return;

    (async () => {
      setStatus("verifying");
      setError("");

      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(data?.error ?? "Could not verify email.");
        return;
      }

      setStatus("verified");
      router.replace("/login?verified=1");
    })();
  }, [token, router]);

  async function handleResend() {
    if (!email) {
      setResendStatus("failed");
      setResendMsg("Missing email address in the URL. Go back to signup.");
      return;
    }

    setResendStatus("sending");
    setResendMsg("");

    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setResendStatus("failed");
      setResendMsg(data?.error ?? "Could not resend verification email.");
      return;
    }

    if (data?.emailSent) {
      setResendStatus("sent");
      setResendMsg("Verification email sent. Check your inbox.");
    } else {
      setResendStatus("failed");
      setResendMsg(
        data?.message ??
          "We couldn’t send the verification email. Please try again later."
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Verify your email
          </CardTitle>
          <CardDescription>
            {hasToken
              ? "Confirming your email now…"
              : "We sent a verification link to your inbox. Click the button in the email to activate your account."}
            {email ? ` (${email})` : ""}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {status === "verifying" && (
            <div className="text-sm text-muted-foreground">Verifying…</div>
          )}

          {status === "error" && (
            <div className="rounded-md border border-red-300 bg-red-50 p-2 text-red-700 text-sm">
              {error}
            </div>
          )}

          {!hasToken && emailSentParam === "0" && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900 text-sm">
              We couldn’t send the verification email automatically. You can try
              resending it below.
            </div>
          )}

          {!hasToken && (
            <div className="text-sm text-muted-foreground">
              Didn’t get it? Check spam, or resend a fresh verification email.
            </div>
          )}

          {!hasToken && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleResend}
                disabled={resendStatus === "sending"}
              >
                {resendStatus === "sending" ? "Resending…" : "Resend email"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/login")}
              >
                Go to login
              </Button>
            </div>
          )}

          {resendMsg && (
            <div
              className={`rounded-md border p-2 text-sm ${
                resendStatus === "sent"
                  ? "border-green-300 bg-green-50 text-green-900"
                  : "border-red-300 bg-red-50 text-red-700"
              }`}
            >
              {resendMsg}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Link
            href="/signup"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to signup
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
