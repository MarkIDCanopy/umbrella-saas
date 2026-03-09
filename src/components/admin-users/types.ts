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

export type AdminOrganizationListItem = {
  id: number;
  orgUid: string;
  name: string;
  teamEnabled: boolean;
  billingEmail: string | null;
  billingCountry: string | null;
  createdAt: string;
  updatedAt: string;
  lastTransactionAt: string | null;

  createdByUser: {
    id: number;
    email: string;
    fullName: string | null;
  };

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

  members: Array<{
    id: number;
    email: string;
    name: string | null;
    role: Role;
    status: string;
    user: {
      id: number;
      email: string;
      fullName: string | null;
    } | null;
  }>;

  _count: {
    members: number;
    transactions: number;
  };
};