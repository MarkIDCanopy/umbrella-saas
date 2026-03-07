// src/components/service-layout/ExecutionModeToggle.tsx
"use client";

import { Button } from "@/components/ui/button";

export type ExecutionMode = "single" | "bulk";

interface Props {
  mode: ExecutionMode;
  setMode: (mode: ExecutionMode) => void;
  disabled?: boolean;
}

export function ExecutionModeToggle({ mode, setMode, disabled }: Props) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <h3 className="text-sm font-medium">Execution mode</h3>

      <p className="text-xs text-muted-foreground">
        Run one verification or submit multiple transactions in one request.
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "single" ? "default" : "outline"}
          onClick={() => setMode("single")}
        >
          Single request
        </Button>

        <Button
          type="button"
          variant={mode === "bulk" ? "default" : "outline"}
          onClick={() => setMode("bulk")}
          disabled={disabled}
        >
          Bulk requests
        </Button>
      </div>

      {mode === "bulk" && (
        <div className="space-y-2">
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <b>Bulk mode</b> allows you to submit multiple verification requests at
            once using a JSON array or file upload.
            <br />
            <b>Important:</b> each entry is processed and charged individually.
            Bulk mode does <b>not</b> reduce credit usage.
            </div>
        </div>
        )}
    </div>
  );
}
