"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ComplianceRequirement =
  | {
      type: "accept_tnc";
      id: string;
      label: string;
      onOpenTnc?: () => void;
      linkLabel?: string;
    }
  | {
      type: "select_reason";
      id: string;
      label: string;
      placeholder?: string;
      options: { value: string; label: string }[];
    };

export type ComplianceGateConfig<FormLike> = {
  when: (form: FormLike) => boolean;
  title: string;
  description?: string;
  requirements: ComplianceRequirement[];
  keyForForm?: (form: FormLike) => string;
};

type GateProps<FormLike> = {
  form: FormLike;
  config: ComplianceGateConfig<FormLike>;
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // called when user cancels / closes dialog (X, ESC, backdrop)
  onCancel?: () => void;

  // IMPORTANT: throw to indicate failure (dialog stays open)
  onConfirmed: (result: Record<string, string | boolean>) => void | Promise<void>;
};

export function ComplianceGate<FormLike>({
  form,
  config,
  open,
  onOpenChange,
  onCancel,
  onConfirmed,
}: GateProps<FormLike>) {
  const active = useMemo(() => config.when(form), [config, form]);

  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [lastKey, setLastKey] = useState<string | null>(null);

  const confirmingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const formKey = useMemo(() => {
    const fn = config.keyForForm;
    return fn ? fn(form) : null;
  }, [config, form]);

  // ✅ Reset when key changes (useEffect, NOT useMemo)
  useEffect(() => {
    if (!formKey) return;
    if (formKey !== lastKey) {
      setValues({});
      setTouched({});
      setLastKey(formKey);
    }
  }, [formKey, lastKey]);

  function setVal(id: string, v: string | boolean) {
    setValues((prev) => ({ ...prev, [id]: v }));
    setTouched((prev) => ({ ...prev, [id]: true }));
  }

  function requirementSatisfied(req: ComplianceRequirement): boolean {
    const v = values[req.id];
    if (req.type === "accept_tnc") return v === true;
    if (req.type === "select_reason") return typeof v === "string" && v.length > 0;
    return false;
  }

  const allSatisfied = active ? config.requirements.every(requirementSatisfied) : true;

  async function confirm() {
    if (submitting) return;

    if (!allSatisfied) {
      const next: Record<string, boolean> = {};
      for (const r of config.requirements) next[r.id] = true;
      setTouched((prev) => ({ ...prev, ...next }));
      return;
    }

    confirmingRef.current = true;
    setSubmitting(true);

    try {
      // ✅ parent may throw -> we keep dialog open
      await onConfirmed(values);

      // ✅ only close if succeeded
      onOpenChange(false);
    } catch {
      // ✅ swallow so Next runtime overlay doesn't trigger
      // dialog stays open; parent should display error UI
    } finally {
      setSubmitting(false);
      confirmingRef.current = false;
    }
  }

  function cancel() {
    onOpenChange(false);
    onCancel?.();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);

        // ✅ X / ESC / backdrop closes => treat as cancel
        if (!v && !confirmingRef.current) {
          onCancel?.();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          {config.description ? (
            <p className="text-sm text-muted-foreground">{config.description}</p>
          ) : null}
        </DialogHeader>

        <div className="space-y-4">
          {config.requirements.map((req) => {
            if (req.type === "accept_tnc") {
              const showErr = touched[req.id] && values[req.id] !== true;

              return (
                <div key={req.id} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      id={req.id}
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={values[req.id] === true}
                      onChange={(e) => setVal(req.id, e.target.checked)}
                      disabled={submitting}
                    />

                    <div className="space-y-1">
                      <Label htmlFor={req.id} className="text-sm">
                        {req.label}
                      </Label>

                      {req.onOpenTnc && (
                        <button
                          type="button"
                          className="text-xs underline text-muted-foreground hover:text-foreground"
                          onClick={req.onOpenTnc}
                          disabled={submitting}
                        >
                          {req.linkLabel ?? "View terms"}
                        </button>
                      )}
                    </div>
                  </div>

                  {showErr && (
                    <p className="text-xs text-red-600">Please accept to continue.</p>
                  )}
                </div>
              );
            }

            if (req.type === "select_reason") {
              const showErr =
                touched[req.id] &&
                !(typeof values[req.id] === "string" && values[req.id]);

              return (
                <div key={req.id} className="space-y-2">
                  <Label className="text-sm">{req.label}</Label>

                  <Select
                    value={typeof values[req.id] === "string" ? (values[req.id] as string) : ""}
                    onValueChange={(v) => setVal(req.id, v)}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={req.placeholder ?? "Select one"} />
                    </SelectTrigger>
                    <SelectContent>
                      {req.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {showErr && (
                    <p className="text-xs text-red-600">
                      Please select a reason to continue.
                    </p>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={cancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm} disabled={submitting}>
            {submitting ? "Saving..." : "Confirm & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
