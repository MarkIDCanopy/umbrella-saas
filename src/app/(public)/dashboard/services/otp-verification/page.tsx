// src/app/(public)/dashboard/services/otp-verification/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { ServiceHeader } from "@/components/service-layout/ServiceHeader";
import { EnvironmentToggle } from "@/components/service-layout/EnvironmentToggle";
import { useUser } from "@/context/UserContext";

import { OtpMethodToggle } from "./OtpMethodToggle";
import { OtpStartInputPanel, OtpMatchInputPanel } from "./InputPanels";
import { OtpOutputPanel } from "./OutputPanel";

import type {
  OtpMethod,
  OtpStartPayload,
  OtpMatchPayload,
  OtpStartResponse,
  OtpMatchResponse,
} from "@/lib/services/mappers/otpVerification";

async function readJsonOrNull(res: Response) {
  return await res.json().catch(() => null);
}

export default function OtpVerificationPage() {
  const [environment, setEnvironment] = useState<"test" | "live">("live");
  const [method, setMethod] = useState<OtpMethod>("sms");

  const [startResponse, setStartResponse] = useState<OtpStartResponse | null>(null);
  const [matchResponse, setMatchResponse] = useState<OtpMatchResponse | null>(null);

  const [startRequest, setStartRequest] = useState<any | null>(null);
  const [matchRequest, setMatchRequest] = useState<any | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchFormKey, setMatchFormKey] = useState(0);

  const { refreshCredits } = useUser();

  const primaryActionClass =
    "mt-4 inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90";

  function resetOtpFlow() {
    setStartResponse(null);
    setMatchResponse(null);
    setStartRequest(null);
    setMatchRequest(null);
    setError(null);
    setIsSubmitting(false);
    setMatchFormKey((v) => v + 1);
  }

  useEffect(() => {
    resetOtpFlow();
  }, [environment]);

  function handleMethodChange(nextMethod: OtpMethod) {
    if (nextMethod === method) return;
    setMethod(nextMethod);
    resetOtpFlow();
  }

  const currentCost = useMemo(() => {
    return method === "sms" ? 2 : 1;
  }, [method]);

  async function handleStart(payload: OtpStartPayload) {
    setError(null);
    setMatchResponse(null);
    setMatchRequest(null);
    setStartRequest({
      operation: payload.method === "sms" ? "sms-verification" : "email-verification",
      ...payload,
    });

    if (environment === "test") {
      setStartResponse({
        kind: "start",
        status: true,
        referenceId: "366691874BD00250933424F72F7C50CB",
        mobileAppToken: "a1378b455f3048059a7be9df6a9da3aa",
        recipient: {
          phoneNumber: payload.method === "sms" ? payload.phoneNumber ?? null : null,
          email: payload.method === "email" ? payload.email ?? null : null,
        },
        state: "CREATED",
        statusCode: 3901,
        statusDescription: "Request in progress",
        statusUpdatedOn: "2025-10-02T10:04:58.505000Z",
        raw: {},
      });
      setMatchResponse(null);
      setMatchFormKey((v) => v + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/services/otp-verification/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readJsonOrNull(res);

      if (!res.ok) {
        throw new Error(data?.error ?? data?.providerError ?? "Verification start failed");
      }

      setStartResponse(data);
      setMatchResponse(null);
      setMatchRequest(null);
      setMatchFormKey((v) => v + 1);
      await refreshCredits();
    } catch (e: any) {
      setError(
        typeof e?.message === "string"
          ? e.message
          : "Verification start failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMatch(payload: OtpMatchPayload) {
    setError(null);
    setMatchRequest({
      operation: "match-verification",
      referenceId: payload.referenceId,
      securityFactor: "******",
    });

    if (environment === "test") {
      if (payload.securityFactor === "123456") {
        setMatchResponse({
          kind: "match",
          status: true,
          referenceId: payload.referenceId,
          verified: true,
          state: "VERIFIED",
          statusCode: 3900,
          statusDescription: "Verified",
          raw: {},
        });
        return;
      }

      setMatchResponse({
        kind: "match",
        status: false,
        referenceId: payload.referenceId,
        verified: false,
        state: "ONGOING",
        statusCode: 3905,
        statusDescription: "Invalid OTP",
        raw: {},
      });
      setError("Invalid OTP. Please try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/services/otp-verification/match/${encodeURIComponent(payload.referenceId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ securityFactor: payload.securityFactor }),
        }
      );

      const data = await readJsonOrNull(res);

      if (!res.ok) {
        setMatchResponse({
          kind: "match",
          status: false,
          referenceId: payload.referenceId,
          verified: false,
          state: data?.state ?? null,
          statusCode: data?.statusCode ?? null,
          statusDescription:
            data?.providerError ?? data?.statusDescription ?? data?.error ?? "Invalid OTP",
          raw: data ?? {},
        });

        setError(
          data?.providerError ?? data?.statusDescription ?? data?.error ?? "OTP verification failed"
        );
        return;
      }

      setMatchResponse(data);

      if (!data?.verified) {
        setError(data?.statusDescription ?? "OTP verification failed");
      }
    } catch (e: any) {
      setError(
        typeof e?.message === "string" ? e.message : "OTP verification failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRetry() {
    setMatchResponse(null);
    setMatchRequest(null);
    setError(null);
    setMatchFormKey((v) => v + 1);
  }

  function resetToInput() {
    resetOtpFlow();
  }

  const referenceId = startResponse?.referenceId ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <ServiceHeader
        title="OTP Verification"
        description="Send one-time passcodes via SMS or email and verify the user-entered OTP."
        badge="OTP"
      />

      <EnvironmentToggle
        mode={environment}
        setMode={setEnvironment}
        fromCost={currentCost}
        cost={currentCost}
      />

      <OtpMethodToggle method={method} setMethod={handleMethodChange} />

      {!startResponse && (
        <OtpStartInputPanel
        key={`${environment}-${method}`}
        mode={environment}
        method={method}
        onSubmit={handleStart}
        loading={isSubmitting}
        />
      )}

      {startResponse && !matchResponse?.verified && (
        <OtpMatchInputPanel
          key={matchFormKey}
          mode={environment}
          referenceId={referenceId}
          onSubmit={handleMatch}
          loading={isSubmitting}
          failed={Boolean(matchResponse && !matchResponse.verified)}
          onRetry={handleRetry}
        />
      )}

      <OtpOutputPanel
        mode={environment}
        startResponse={startResponse}
        matchResponse={matchResponse}
        error={error}
        startRequest={startRequest}
        matchRequest={matchRequest}
      />

      {startResponse && (
        <button onClick={resetToInput} className={primaryActionClass}>
          Run another request
        </button>
      )}
    </div>
  );
}