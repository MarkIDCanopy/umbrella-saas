// src/components/service-layout/schema/addressBulk.schema.ts
import { z } from "zod";

const AddressSchema = z.object({
  street: z.string(),
  houseNumber: z.string(),
  zip: z.string(),
  city: z.string(),
  country: z.string().length(2),
});

export const AddressVerifySchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string(),
  address: AddressSchema,
});

export const AddressBulkSchema = z.object({
  requests: z.array(AddressVerifySchema).min(1),
});

export type AddressBulkPayload = z.infer<typeof AddressBulkSchema>;
