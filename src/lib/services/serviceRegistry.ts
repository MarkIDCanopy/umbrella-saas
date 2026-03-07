// src/lib/services/serviceRegistry.ts
import type React from "react";

import { AddressOutputPanel } from "@/app/(public)/dashboard/services/address-verification/OutputPanel";
import { PhoneStatusOutputPanel } from "@/app/(public)/dashboard/services/phone-status/OutputPanel";
import { PhoneRiskScoreOutputPanel } from "@/app/(public)/dashboard/services/phone-risk/OutputPanel";
import { PhoneIdOutputPanel } from "@/app/(public)/dashboard/services/phone-id/OutputPanel";

import { mapAddressVerificationTxnResponse } from "@/lib/services/mappers/addressVerification";
import { mapPhoneStatusTxnResponse } from "@/lib/services/mappers/phoneStatus";
import { mapPhoneRiskTxnResponse } from "@/lib/services/mappers/phoneRisk";
import { mapPhoneIdTxnResponse } from "@/lib/services/mappers/phoneId";
import { mapFullPhoneIntelligenceTxnResponse } from "@/lib/services/mappers/fullPhoneIntelligence";
import { FullPhoneIntelligenceOutputPanel } from "@/app/(public)/dashboard/services/full-phone-intelligence/OutputPanel";
import { KybOutputPanel } from "@/app/(public)/dashboard/services/kyb/OutputPanel";
import { mapKybTxnResponse } from "@/lib/services/mappers/kyb";

export type ServiceRenderer = {
  label: string;
  RequestSummary?: React.ComponentType<{ request: any }>;
  OutputPanel?: React.ComponentType<any>;
  mapTxnResponse?: (providerBody: any) => any;
};

export const serviceRegistry: Record<string, ServiceRenderer> = {
  "address-verification": {
    label: "Address verification",
    OutputPanel: AddressOutputPanel,
    mapTxnResponse: mapAddressVerificationTxnResponse,
  },

  "phone-status": {
    label: "Phone status check",
    OutputPanel: PhoneStatusOutputPanel,
    mapTxnResponse: mapPhoneStatusTxnResponse,
  },

  "phone-risk": {
    label: "Phone Risk Score",
    OutputPanel: PhoneRiskScoreOutputPanel,
    mapTxnResponse: mapPhoneRiskTxnResponse,
  },

  "phone-id": {
    label: "Phone ID",
    OutputPanel: PhoneIdOutputPanel,
    mapTxnResponse: mapPhoneIdTxnResponse,
  },
    "full-phone-intelligence": {
    label: "Full Phone Intelligence",
    OutputPanel: FullPhoneIntelligenceOutputPanel,
    mapTxnResponse: mapFullPhoneIntelligenceTxnResponse,
  },
    "kyb": {
    label: "KYB",
    OutputPanel: KybOutputPanel,
    mapTxnResponse: mapKybTxnResponse,
  },
  
};