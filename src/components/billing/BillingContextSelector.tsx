// src/components/billing/BillingContextSelector.tsx
"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type BillingContext =
  | { kind: "user"; id: number; label: string }
  | { kind: "org"; id: number; label: string };

type Props = {
  contexts: BillingContext[];
  value: BillingContext;
  onChange: (ctx: BillingContext) => void;
};

export function BillingContextSelector({
  contexts,
  value,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{value.label}</span>
        <ChevronDown className="h-4 w-4 opacity-60" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border bg-popover shadow-md">
          <ul className="py-1">
            {contexts.map((ctx) => {
              const selected =
                ctx.kind === value.kind && ctx.id === value.id;

              return (
                <li key={`${ctx.kind}-${ctx.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(ctx);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted",
                      selected && "bg-muted"
                    )}
                  >
                    <span>{ctx.label}</span>
                    {selected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
