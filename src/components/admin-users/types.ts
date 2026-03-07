// src/components/admin-users/types.ts
export type Role = "owner" | "admin" | "user" | "viewer";

export type AdminUserListItem = {
  id: number;
  email: string;
  fullName: string | null;
  country: string | null;
  createdAt: string;
  emailVerifiedAt: string | null;
  isAdmin: boolean;
  adminRole: string | null;
  isBlocked: boolean;
  blockedAt: string | null;
  blockedUntil: string | null;
  blockedReason: string | null;
  deletedAt: string | null;
  lastTransactionAt: string | null;

  creditWallet: {
    id: number;
    balance: number;
    billingProfile: {
      billingType: string;
      email: string;
      fullName: string | null;
      companyName: string | null;
      country: string;
    } | null;
  } | null;

  organizationMembers: Array<{
    id: number;
    role: Role;
    status: string;
    organization: {
      id: number;
      name: string;
    };
  }>;

  _count: {
    transactions: number;
    organizationMembers: number;
  };
};