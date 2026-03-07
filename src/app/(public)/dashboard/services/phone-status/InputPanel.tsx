// src/app/(public)/dashboard/services/phone-status/InputPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";

export type PhoneStatusPayload = {
  phoneNumber: string;
};

type Props = {
  mode: EnvironmentMode;
  onSubmit: (payload: PhoneStatusPayload) => void;
  loading?: boolean;
};

export function PhoneStatusInputPanel({ mode, onSubmit, loading }: Props) {
  const [phoneNumber, setPhoneNumber] = useState(
    mode === "test" ? "+4915123456789" : ""
  );

  useEffect(() => {
    setPhoneNumber(mode === "test" ? "+4915123456789" : "");
  }, [mode]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ phoneNumber });
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold">
          {mode === "test" ? "Test request" : "Live request"}
        </h2>
        <p className="text-xs text-muted-foreground">
          Enter a phone number in international format.
        </p>
      </div>

      <Input
        placeholder="+436501234567"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />

      <Button type="submit" className="w-full" disabled={!phoneNumber || loading}>
        {loading ? "Checking…" : "Check phone status"}
      </Button>
    </form>
  );
}

