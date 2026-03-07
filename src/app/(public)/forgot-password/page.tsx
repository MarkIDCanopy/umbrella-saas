// src/app/(public)/forgot-password/page.tsx

"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Could not send reset link.");
        return;
      }

      setDone(true);
    } catch {
      setError("Could not send reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, border: "1px solid #e5e7eb", borderRadius: 12, padding: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Reset your password</h1>
        <p style={{ color: "#6b7280", marginBottom: 16 }}>
          Enter your email and we’ll send you a reset link.
        </p>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 10, borderRadius: 10, color: "#991b1b", marginBottom: 12 }}>
            {error}
          </div>
        )}

        {done && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 10, borderRadius: 10, color: "#14532d", marginBottom: 12 }}>
            If an account exists for this email, we sent a password reset link.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
          <label style={{ fontSize: 12, color: "#374151" }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px" }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "white" }}
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <Link href="/login" style={{ color: "#6b7280" }}>Back to sign in</Link>
          <Link href="/signup" style={{ color: "#6b7280" }}>Create account</Link>
        </div>
      </div>
    </div>
  );
}
