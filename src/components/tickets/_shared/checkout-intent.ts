import { z } from "zod";
import { providerPaymentId } from "@/lib/tickets/portone/payment-id";

// Feature-private pure-module exception: checkout and confirmation are sibling
// React owners of the same record; retirement must validate exactly what write
// and restore accept. This exports schema/data, not a renamed storage facade.
export const checkoutIntentKey = "sphmrs.portone-checkout.v1";
export const checkoutIntentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  attemptId: z.uuid(),
  quantity: z.int().min(1).max(6),
  order: z.strictObject({
    paymentId: providerPaymentId,
    quantity: z.int().min(1).max(6),
    totalAmount: z.int().positive(),
    currency: z.enum(["KRW", "USD"]),
  }).optional(),
}).refine((value) => !value.order || value.order.quantity === value.quantity);

export type CheckoutIntent = z.infer<typeof checkoutIntentSchema>;
