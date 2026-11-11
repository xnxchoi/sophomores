import { z } from "zod";

const identifier = z.string().trim().min(1).max(128);
const amount = z.int().min(0).max(Number.MAX_SAFE_INTEGER);

/** Public claim rejections are deliberately paired with their HTTP status. */
export const guestClaimRejectionSchema = z.discriminatedUnion("code", [
  z.strictObject({ code: z.literal("CLAIM_INVALID"), status: z.literal(400) }),
  z.strictObject({ code: z.literal("CLAIM_EXPIRED"), status: z.literal(410) }),
  z.strictObject({ code: z.literal("CLAIM_CONSUMED"), status: z.literal(409) }),
  z.strictObject({ code: z.literal("CLAIM_UNAVAILABLE"), status: z.literal(409) }),
  z.strictObject({ code: z.literal("ACCOUNT_NOT_ELIGIBLE"), status: z.literal(403) }),
  z.strictObject({ code: z.literal("EVENT_ALREADY_BOUND"), status: z.literal(409) }),
]);

/** KR is the implemented address format, not an assertion of approved coverage. */
export const shippingAddressSchema = z.strictObject({
  country: z.literal("KR"),
  recipientName: z.string().trim().min(1).max(100),
  phone: z.string().trim().regex(/^(?:\+82[ -]?|0)[0-9 -]{8,15}$/),
  postalCode: z.string().trim().regex(/^\d{5}$/),
  addressLine1: z.string().trim().min(1).max(300),
  addressLine2: z.string().trim().max(200).optional(),
  deliveryInstructions: z.string().trim().max(500).optional(),
});
export type ShippingAddress = Readonly<z.infer<typeof shippingAddressSchema>>;

export const commerceSnapshotSchema = z.strictObject({
  version: z.literal(1), customerID: identifier, cartID: identifier,
  productID: identifier, eventID: identifier, releaseID: identifier,
  quantity: z.int().min(1).max(3), currency: z.literal("KRW"),
  unitAmount: z.int().min(1).max(Number.MAX_SAFE_INTEGER),
  shippingAmount: amount, totalAmount: z.int().min(1).max(Number.MAX_SAFE_INTEGER),
  orderName: z.string().trim().min(1).max(200), shippingAddress: shippingAddressSchema,
  productVersion: z.string().trim().min(1).max(100), eventVersion: z.string().trim().min(1).max(100),
}).refine((value) => value.releaseID === value.productID, { message: "Release must be the product in commerce v1" })
  .refine((value) => Number.isSafeInteger(value.unitAmount * value.quantity + value.shippingAmount)
    && value.totalAmount === value.unitAmount * value.quantity + value.shippingAmount,
  { message: "Charge snapshot arithmetic mismatch" });
export type CommerceSnapshot = Readonly<Omit<z.infer<typeof commerceSnapshotSchema>, "shippingAddress"> & { shippingAddress: ShippingAddress }>;
