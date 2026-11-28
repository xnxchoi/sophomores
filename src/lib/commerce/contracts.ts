import { z } from "zod";
import { refundTermsSchema } from "./refund-policy";

const identifier = z.string().trim().min(1).max(128);
const amount = z.int().min(0).max(Number.MAX_SAFE_INTEGER);

/**
 * Account rules are keyed by token type (owner, 22 Nov: "other tokens may come in
 * later, and those may not have the same rule"). Commerce v1 sells the membership
 * token only, and every v1 settle grants membership. Its type is the allowance
 * namespace, so the single membership token per account rule holds across every
 * product and release. A future token type gets its own namespace and its own
 * recorded limit without touching this one. Tickets, guest invites and
 * event/invitation keys never use this allowance.
 */
export const MEMBERSHIP_RELEASE = "membership";
/** The rule new v1 snapshots are created under. Each snapshot records its own. */
export const MEMBERSHIP_ACCOUNT_LIMIT = 1;
/** A blank product maximum imposes no additional per-account limit. */
export const productMaximumPerPersonSchema = z.int().positive().nullish();
/**
 * Storage holds at most three units per order (`commerce-reservations.quantity`,
 * `commerce-admissions.unit`, and every attempt parser), so a recorded limit or
 * quantity outside 1–3 is refused everywhere, not only further down.
 */
export const MAX_ORDER_UNITS = 3;

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

/** The displayed Guest quote is a precondition, never a source of price or cart authority. */
export const guestCheckoutQuoteSchema = z.strictObject({
  productID: z.uuid(),
  quantity: z.int().min(1).max(MAX_ORDER_UNITS),
  totalAmount: amount.positive(),
  // The refund terms shown beside Pay; the server re-derives them and refuses a stale quote (Review-B r3).
  refundTerms: refundTermsSchema,
});
export type GuestCheckoutQuote = Readonly<z.infer<typeof guestCheckoutQuoteSchema>>;

// Version the disclosure without duplicating the checkout email in a snapshot.
export const TICKET_EMAIL_CONSENT = "unlock-ticket-email-v1";
export const ticketEmailConsentSchema = z.literal(TICKET_EMAIL_CONSENT).optional();


export const purchaseChargeFields = {
  customerID: identifier, cartID: identifier, productID: identifier, eventID: identifier,
  quantity: z.int().min(1).max(MAX_ORDER_UNITS), accountLimit: z.int().min(1).max(MAX_ORDER_UNITS), currency: z.literal("KRW"),
  unitAmount: z.int().min(1).max(Number.MAX_SAFE_INTEGER),
  shippingAmount: amount, totalAmount: z.int().min(1).max(Number.MAX_SAFE_INTEGER),
  orderName: z.string().trim().min(1).max(200), shippingAddress: shippingAddressSchema,
  productVersion: z.string().trim().min(1).max(100), eventVersion: z.string().trim().min(1).max(100),
};

export const matchesPurchaseCharge = (value: {
  quantity: number; accountLimit: number; unitAmount: number; shippingAmount: number; totalAmount: number;
}) => value.quantity <= value.accountLimit && Number.isSafeInteger(value.unitAmount * value.quantity + value.shippingAmount)
  && value.totalAmount === value.unitAmount * value.quantity + value.shippingAmount;

// Keep legacy field order: existing reservation hashes depend on it.
const { customerID, cartID, productID, eventID, ...charge } = purchaseChargeFields;
export const commerceSnapshotSchema = z.strictObject({
  version: z.literal(1), customerID, cartID, productID, eventID, releaseID: z.literal(MEMBERSHIP_RELEASE), ...charge,
}).refine((value) => value.quantity <= value.accountLimit, { message: "Quantity exceeds the recorded account limit" })
  .refine(matchesPurchaseCharge, { message: "Charge snapshot arithmetic mismatch" });
export type CommerceSnapshot = Readonly<Omit<z.infer<typeof commerceSnapshotSchema>, "shippingAddress"> & { shippingAddress: ShippingAddress }>;
