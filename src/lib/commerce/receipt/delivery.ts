import { z } from "zod";
import { shippingAddressSchema } from "../contracts";

export const receiptDeliverySchema = z.object({
  address: shippingAddressSchema.omit({ deliveryInstructions: true }),
  fulfillment: z.object({
    status: z.enum(["pending", "packed", "shipped", "delivered", "return-requested", "returned"]).nullish(),
    carrier: z.string().max(200).nullish(), trackingNumber: z.string().max(200).nullish(),
  }).nullish(),
});
