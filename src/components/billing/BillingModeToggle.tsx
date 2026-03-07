// src/components/billing/BillingModeToggle.tsx
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type BillingMode = "personal" | "company";

type Props = {
  value: BillingMode;
  onChange: (v: BillingMode) => void;
};

export function BillingModeToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-muted/30 p-1">
      <Button
        type="button"
        size="sm"
        variant={value === "personal" ? "default" : "ghost"}
        className={cn("rounded-md")}
        onClick={() => onChange("personal")}
      >
        Personal
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "company" ? "default" : "ghost"}
        className={cn("rounded-md")}
        onClick={() => onChange("company")}
      >
        Company
      </Button>
    </div>
  );
}
