export type TransactionStatus = "OK" | "REVIEW" | "NOK" | "ERROR";
export type TransactionEnvironment = "test" | "live";
export type TransactionExecutionMode = "single" | "bulk";

export type TransactionService =
  | "address-verification"
  | "full-phone-intelligence"
  | "age-verification"
  | "identity-verification"
  | "phone-status"
  | "phone-risk"
  | "phone-id"
  | string;

export type Transaction = {
  id: string;
  service: TransactionService;

  createdAt: string;
  durationMs: number;

  status: TransactionStatus;

  environment?: TransactionEnvironment;
  executionMode?: TransactionExecutionMode;
  batchId?: string | null;

  request: any;
  response: any;

  creditCost?: number | null;
};