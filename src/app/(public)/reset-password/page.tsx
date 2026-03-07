// src/app/(public)/reset-password/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();

  const token = params.get("token");
  const email = params.get("email");

  const hasToken = useMemo(() => Boolean(token), [token]);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);

    if (!token) {
      setError("Missing reset token. Please request a new reset email.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Could not reset password.");
        return;
      }

      setDone(true);
      router.push("/login?reset=1");
    } catch (err) {
      console.error(err);
      setError("Could not reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Umbrella SaaS" className="h-8 w-8 rounded-xl" />
          <span className="text-sm font-semibold tracking-tight">Umbrella SaaS</span>
        </div>

        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
          Sign in
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Choose a new password
            </CardTitle>
            <CardDescription>
              {email ? `Resetting password for ${email}` : "Enter a new password for your account."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!hasToken && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900 text-sm">
                Missing or invalid reset link. Please request a new one.
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 p-2 text-red-700 text-sm">
                {error}
              </div>
            )}

            {done && (
              <div className="rounded-md border border-green-300 bg-green-50 p-2 text-green-900 text-sm">
                Password updated. Redirecting to sign in…
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>New password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={!hasToken || loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={!hasToken || loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={!hasToken || loading}>
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="text-xs text-slate-500 flex justify-between">
            <Link href="/forgot-password" className="hover:underline">
              Request new link
            </Link>
            <Link href="/login" className="hover:underline">
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
