// src/components/settings/PersonalProfileForm.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CountrySelect,
  normalizeCountryToISO2,
} from "@/components/ui/CountrySelect";
import { cleanName } from "@/lib/input-safeguards";

import { WorkspaceSwitcher } from "@/components/settings/WorkspaceSwitcher";

export function PersonalProfileForm() {
  const { user, refreshUser } = useUser();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("AT");

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ✅ only auto-prefill once per user-load
  const didPrefillRef = useRef(false);
  const lastUserIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (!user) return;

    const userId = (user as any).id ?? null;
    if (userId !== lastUserIdRef.current) {
      lastUserIdRef.current = userId;
      didPrefillRef.current = false;
    }

    if (didPrefillRef.current) return;

    const nextFullName = String((user as any).full_name ?? "");
    const nextEmail = String((user as any).email ?? "");
    const nextCountry = normalizeCountryToISO2((user as any).country) || "AT";

    setFullName(nextFullName);
    setEmail(nextEmail);
    setCountry(nextCountry);

    didPrefillRef.current = true;
  }, [user]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim(),
        country,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setErrorMsg(data.error || "Could not update profile.");
      return;
    }

    // ✅ allow re-prefill from updated user
    didPrefillRef.current = false;

    await refreshUser(); // refreshUser() refreshes credits too in your UserContext
    setSuccessMsg("Saved successfully");
  }

  return (
    <div className="space-y-6">
      <WorkspaceSwitcher />
        <form onSubmit={handleSave} className="space-y-4 max-w-xl">
          {errorMsg && (
            <div className="rounded-md border border-red-300 bg-red-50 p-2 text-red-700 text-sm">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="rounded-md border border-green-300 bg-green-50 p-2 text-green-700 text-sm">
              {successMsg}
            </div>
          )}

          <div>
            <Label>Full name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(cleanName(e.target.value))}
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label>Country</Label>
            <CountrySelect value={country} onChange={setCountry} />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
    </div>
  );
}
