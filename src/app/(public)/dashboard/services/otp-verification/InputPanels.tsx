// src/app/(public)/dashboard/services/otp-verification/InputPanels.tsx
"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { EnvironmentMode } from "@/components/service-layout/EnvironmentToggle";
import type {
  OtpMethod,
  OtpStartPayload,
  OtpMatchPayload,
} from "@/lib/services/mappers/otpVerification";
import {
  cleanEmail,
  cleanPhoneInput,
  cleanOtpCode,
} from "@/lib/input-safeguards"; 

type StartProps = {
  mode: EnvironmentMode;
  method: OtpMethod;
  onSubmit: (payload: OtpStartPayload) => void;
  loading?: boolean;
};

type MatchProps = {
  mode: EnvironmentMode;
  referenceId: string;
  onSubmit: (payload: OtpMatchPayload) => void;
  loading?: boolean;
  failed?: boolean;
  onRetry?: () => void;
};

export function OtpStartInputPanel({
  mode,
  method,
  onSubmit,
  loading,
}: StartProps) {
  const [phoneNumber, setPhoneNumber] = useState(
    mode === "test" ? "+436501234567" : ""
  );
  const [email, setEmail] = useState(mode === "test" ? "test@test.com" : "");

  useEffect(() => {
  setPhoneNumber(mode === "test" ? "+436501234567" : "");
  setEmail(mode === "test" ? "test@test.com" : "");
}, [mode, method]);

  function submit(e: React.FormEvent) {
    e.preventDefault();

    onSubmit(
      method === "sms"
        ? {
            method,
            phoneNumber: cleanPhoneInput(phoneNumber),
          }
        : {
            method,
            email: cleanEmail(email),
          }
    );
  }

  const currentValue =
    method === "sms" ? cleanPhoneInput(phoneNumber) : cleanEmail(email);

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold">
          {mode === "test" ? "Test OTP verification" : "OTP verification"}
        </h2>
        <p className="text-xs text-muted-foreground">
          Send a one-time passcode to the user and continue with OTP matching.
        </p>
      </div>

      <div className="space-y-3">
        {method === "sms" ? (
          <Input
            placeholder="Phone number in international format, e.g. +436501234567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(cleanPhoneInput(e.target.value))}
          />
        ) : (
          <Input
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(cleanEmail(e.target.value))}
          />
        )}
      </div>

      <Button type="submit" className="w-full" disabled={!currentValue || loading}>
        {loading ? "Starting…" : "Run verification"}
      </Button>
    </form>
  );
}

export function OtpMatchInputPanel({
  mode,
  referenceId,
  onSubmit,
  loading,
  failed,
  onRetry,
}: MatchProps) {
  const [securityFactor, setSecurityFactor] = useState(
    mode === "test" ? "123456" : ""
  );

  useEffect(() => {
    setSecurityFactor(mode === "test" ? "123456" : "");
  }, [mode, referenceId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();

    onSubmit({
      referenceId,
      securityFactor: cleanOtpCode(securityFactor),
    });
  }

  const cleanValue = cleanOtpCode(securityFactor);

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold">Enter OTP</h2>
        <p className="text-xs text-muted-foreground">
          The verification has been started. Enter the code received by the user and check it.
        </p>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="OTP code"
          value={securityFactor}
          onChange={(e) => setSecurityFactor(cleanOtpCode(e.target.value))}
          inputMode="numeric"
        />

        {failed && onRetry && (
          <Button type="button" variant="outline" className="w-full" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={!cleanValue || loading}>
        {loading ? "Checking…" : "Check"}
      </Button>
    </form>
  );
}