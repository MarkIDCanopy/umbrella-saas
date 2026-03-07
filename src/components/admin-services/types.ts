// src/components/admin-services/types.ts
export type AdminServiceCountryPrice = {
  id: number;
  countryCode: string;
  priceEur: number;
  active: boolean;
};

export type AdminServiceOperationPrice = {
  id: number;
  operationKey: string;
  priceCredits: number;
  active: boolean;
};

export type AdminServiceListItem = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  priceCredits: number;
  features: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  countryPrices: AdminServiceCountryPrice[];
  operationPrices: AdminServiceOperationPrice[];
  _count: {
    creditTransactions: number;
    countryPrices: number;
    operationPrices: number;
  };
};