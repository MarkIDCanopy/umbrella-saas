// src/app/(public)/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

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

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Invalid credentials");
      return;
    }

    await refreshUser();
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img
            src="/logo.svg"
            alt="Umbrella SaaS"
            className="h-8 w-8 rounded-xl"
          />
          <span className="text-sm font-semibold tracking-tight">
            Umbrella SaaS
          </span>
        </div>
        <Link
          href="/signup"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Create account
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Welcome back
            </CardTitle>
            <CardDescription>
              Sign in to access your Umbrella SaaS dashboard.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-2 text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </CardContent>

          <CardFooter className="text-xs text-slate-500 flex justify-between">
            <Link href="/forgot-password" className="hover:underline">
              Forgot password?
            </Link>
            <Link href="/signup" className="hover:underline">
              Create account
            </Link>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
