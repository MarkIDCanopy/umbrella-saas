// src/app/(public)/dashboard/services/kyb/KybModeToggle.tsx
"use client";

import { Button } from "@/components/ui/button";
import type { KybMode } from "@/lib/services/mappers/kyb";

type Props = {
  mode: KybMode;
  setMode: (mode: KybMode) => void;
};

export function KybModeToggle({ mode, setMode }: Props) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <h3 className="text-sm font-medium">Request type</h3>

      <p className="text-xs text-muted-foreground">
        Search for a company first, then use the returned transaction ID and company ID for a deeper KYB lookup.
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "company-search" ? "default" : "outline"}
          onClick={() => setMode("company-search")}
        >
          Company search
        </Button>

        <Button
          type="button"
          variant={mode === "advanced-search" ? "default" : "outline"}
          onClick={() => setMode("advanced-search")}
        >
          Advanced search
        </Button>
      </div>

      {mode === "advanced-search" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Advanced search requires a <b>transactionId</b> and <b>companyId</b> returned from Company search.
        </div>
      )}
    </div>
  );
}