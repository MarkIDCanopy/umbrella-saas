// src/app/(public)/invite/accept/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type ApiOk = { success: true; organizationId?: number };

type ApiError = {
  success?: false;
  error: string;
  code?: string;
  invitedEmail?: string;
  currentEmail?: string;
};

type ApiResp = ApiOk | ApiError;

function parseJsonSafe(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function isApiError(v: any): v is ApiError {
  return !!v && typeof v === "object" && typeof v.error === "string";
}

export default function InviteAcceptPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const token = String(sp.get("token") ?? "").trim();

  const returnTo = useMemo(() => {
    const here =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : `/invite/accept?token=${encodeURIComponent(token)}`;
    return here;
  }, [token]);

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [err, setErr] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setStatus("error");
        setErr({ error: "Missing invite token." });
        return;
      }

      try {
        const res = await fetch("/api/organizations/members/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const text = await res.text().catch(() => "");
        const parsed = parseJsonSafe(text) as ApiResp | null;

        if (cancelled) return;

        if (!res.ok) {
          setStatus("error");

          if (isApiError(parsed)) {
            setErr(parsed);
          } else {
            setErr({ error: text || "Failed to accept invite." });
          }
          return;
        }

        // success
        setStatus("ok");
        router.replace("/dashboard/settings?tab=organization");
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setErr({ error: e?.message || "Failed to accept invite." });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-xl px-6 py-14">
        <div className="rounded-2xl border bg-background p-8">
          <h1 className="text-2xl font-semibold">Accepting invite</h1>
          <p className="mt-4 text-sm text-muted-foreground">Please wait…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    const msg = err?.error || "Invite failed.";

    return (
      <div className="mx-auto max-w-xl px-6 py-14">
        <div className="rounded-2xl border bg-background p-8">
          <h1 className="text-2xl font-semibold">Accepting invite</h1>

          <div className="mt-5 rounded-xl border bg-red-50 px-4 py-3 text-sm text-red-700">
            {msg}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              onClick={() =>
                router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`)
              }
            >
              Back to login
            </Button>

            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Go to dashboard
            </Button>

            <Link
              className="text-sm text-muted-foreground underline underline-offset-4 sm:ml-auto"
              href="/"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-14">
      <div className="rounded-2xl border bg-background p-8">
        <h1 className="text-2xl font-semibold">Invite accepted</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Redirecting you to your dashboard…
        </p>
      </div>
    </div>
  );
}