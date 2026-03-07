//src/components/settings/ChangePasswordForm.tsx
"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // LIVE password match validation
  function updateNewPassword(value: string) {
    setNewPassword(value);
    if (confirmPassword && value !== confirmPassword) {
      setError("New passwords do not match.");
    } else {
      setError("");
    }
  }

  function updateConfirmPassword(value: string) {
    setConfirmPassword(value);
    if (newPassword && value !== newPassword) {
      setError("New passwords do not match.");
    } else {
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Could not change password.");
      return;
    }

    // Reset form
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setSuccess("Password updated successfully!");
  }

  return (
    <div className="mt-8">
      <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-base font-medium hover:bg-accent transition">
          <span>Change Password</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
          <form
            onSubmit={handleSubmit}
            className="mt-4 space-y-4 rounded-lg border p-4 max-w-xl"
          >
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 p-2 text-red-700 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md border border-green-300 bg-green-50 p-2 text-green-700 text-sm">
                {success}
              </div>
            )}

            <div>
              <Label>Current password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>New password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => updateNewPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Confirm new password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => updateConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={saving || !!error}>
              {saving ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
