// src/components/service-layout/schema/phoneStatusBulk.schema.ts
import { z } from "zod";

export const PhoneStatusItemSchema = z.object({
  phoneNumber: z.string().min(5),
});

export const PhoneStatusBulkSchema = z.object({
  items: z.array(PhoneStatusItemSchema).min(1),
});

export type PhoneStatusBulkPayload = z.infer<typeof PhoneStatusBulkSchema>;
