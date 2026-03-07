// src/app/(public)/dashboard/services/phone-risk/InputPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";

export type PhoneRiskScorePayload = {
  phoneNumber: string;
  emailAddress?: string;
};

type Props = {
  mode: EnvironmentMode;
  onSubmit: (payload: PhoneRiskScorePayload) => void;
  loading?: boolean;
};

export function PhoneRiskScoreInputPanel({ mode, onSubmit, loading }: Props) {
  const [phoneNumber, setPhoneNumber] = useState(
    mode === "test" ? "+436501234567" : ""
  );
  const [emailAddress, setEmailAddress] = useState(
    mode === "test" ? "test@example.com" : ""
  );

  useEffect(() => {
    setPhoneNumber(mode === "test" ? "+436501234567" : "");
    setEmailAddress(mode === "test" ? "test@example.com" : "");
  }, [mode]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      phoneNumber,
      emailAddress: emailAddress.trim() ? emailAddress.trim() : undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold">
          {mode === "test" ? "Test request" : "Live request"}
        </h2>
        <p className="text-xs text-muted-foreground">
          Enter a phone number in international format. Email is optional and can improve risk signal quality.
        </p>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="+436501234567"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <Input
          placeholder="Email (optional)"
          value={emailAddress}
          onChange={(e) => setEmailAddress(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={!phoneNumber || loading}>
        {loading ? "Checking…" : "Get risk score"}
      </Button>

      <div className="text-xs text-muted-foreground">
        Hidden parameters used automatically: <span className="font-medium">accountLifecycleEvent</span> and (when available) <span className="font-medium">originatingIp</span>.
      </div>
    </form>
  );
}