// src/app/(public)/dashboard/services/otp-verification/OtpMethodToggle.tsx
"use client";

import { Button } from "@/components/ui/button";
import type { OtpMethod } from "@/lib/services/mappers/otpVerification";

type Props = {
  method: OtpMethod;
  setMethod: (method: OtpMethod) => void;
};

export function OtpMethodToggle({ method, setMethod }: Props) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <h3 className="text-sm font-medium">Request type</h3>

      <p className="text-xs text-muted-foreground">
        Choose SMS or email verification first, then send the OTP to the selected recipient.
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={method === "sms" ? "default" : "outline"}
          onClick={() => setMethod("sms")}
        >
          SMS verification
        </Button>

        <Button
          type="button"
          variant={method === "email" ? "default" : "outline"}
          onClick={() => setMethod("email")}
        >
          Email verification
        </Button>
      </div>

      {method === "email" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Email verification sends the OTP to the provided email address.
        </div>
      )}
    </div>
  );
}