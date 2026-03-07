// src/components/service-layout/EnvironmentToggle.tsx
"use client";

import { Switch } from "@/components/ui/switch";

export type EnvironmentMode = "test" | "live";

interface Props {
  mode: EnvironmentMode;
  setMode: (mode: EnvironmentMode) => void;

  // "From X credits" (static baseline)
  fromCost?: number;

  // Dynamic cost (e.g. based on country)
  cost?: number | null;
}

export function EnvironmentToggle({ mode, setMode, fromCost = 0, cost }: Props) {
  const isLive = mode === "live";

  const showFrom = fromCost > 0;
  const showDynamicCost =
    typeof cost === "number" && cost > 0 && cost !== fromCost;

  return (
    <div className="p-4 rounded-xl border bg-card flex justify-between items-center gap-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Environment</h3>

        {isLive ? (
          <div className="text-xs text-red-600 bg-red-100 border border-red-300 px-2 py-1 rounded-md shadow-sm space-y-1">
            <div>
              Live mode performs a real verification.{" "}
              {showFrom && (
                <>
                  From <span className="font-semibold">{fromCost} credits</span>.
                </>
              )}
            </div>

            {showDynamicCost && (
              <div>
                Cost: <span className="font-semibold">{cost} credits</span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <b>Test mode</b> is only a simulation. You cannot perform an actual
            verification here.
            <br />
            Please switch to <b>Live</b> mode to run a real verification.
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className={isLive ? "font-medium" : "text-muted-foreground"}>
          Live
        </span>

        <Switch
          checked={mode === "test"}
          onCheckedChange={(checked) => setMode(checked ? "test" : "live")}
        />

        <span className={mode === "test" ? "font-medium" : "text-muted-foreground"}>
          Test
        </span>
      </div>
    </div>
  );
}
