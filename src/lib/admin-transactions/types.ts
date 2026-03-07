// src/lib/admin-transactions/types.ts
export type AdminTransaction = {
  id: string;
  userId: number;
  organizationId: number | null;

  service: string;
  status: "OK" | "REVIEW" | "NOK" | "ERROR";
  environment: "test" | "live";
  executionMode: "single" | "bulk";

  batchId: string | null;
  createdAt: string;
  durationMs: number;

  request: unknown;
  response: unknown;

  creditCost: number | null;

  user: {
    id: number;
    email: string;
    fullName: string | null;
  };

  organization: {
    id: number;
    name: string;
  } | null;
};