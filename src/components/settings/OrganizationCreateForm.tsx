// src/components/settings/OrganizationCreateForm.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function OrganizationCreateForm({ onCreated }: { onCreated: (org: any) => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/organizations/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create organization.");
      setLoading(false);
      return;
    }

    onCreated(data.organization);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <Input
        placeholder="Organization name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Organization"}
      </Button>
    </form>
  );
}
