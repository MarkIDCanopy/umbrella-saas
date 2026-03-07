// src/components/compliance/config.ts
import type { ComplianceGateConfig } from "@/components/compliance/ComplianceGate";

export function austriaCompliance<FormLike extends { country: string }>(): ComplianceGateConfig<FormLike> {
  return {
    when: (f) => (f.country || "").toUpperCase() === "AT",
    title: "Additional confirmation required (Austria)",
    description: "For Austria, please confirm the conditions before proceeding.",
    keyForForm: (f) => `country:${(f.country || "").toUpperCase()}`,
    requirements: [
      {
        type: "accept_tnc",
        id: "accepted_tnc",
        label: "I confirm I have the right to verify this person and will comply with the Terms & Conditions.",
        linkLabel: "View Terms",
      },
      {
        type: "select_reason",
        id: "reason",
        label: "Reason for verification",
        placeholder: "Choose a reason",
        options: [
          { value: "onboarding", label: "Customer onboarding" },
          { value: "fraud_prevention", label: "Fraud prevention" },
          { value: "regulatory", label: "Regulatory requirement" },
          { value: "other", label: "Other" },
        ],
      },
    ],
  };
}
