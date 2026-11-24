import { createHash } from "node:crypto";
import { z } from "zod";
import { sharedTicketTarget } from "./event-tickets";
import { editionRuleFacts, matchesRecordedEditionRule } from "./edition-rules";

const id = z.string().trim().min(1).max(128);
const revision = z.string().trim().min(1).max(128);
const address = z.strictObject({
  country: z.literal("KR"),
  recipientName: z.string().trim().min(1).max(100),
  phone: z.string().trim().regex(/^(?:\+82[ -]?|0)[0-9 -]{8,15}$/),
  postalCode: z.string().trim().regex(/^\d{5}$/),
  addressLine1: z.string().trim().min(1).max(300),
  addressLine2: z.string().trim().max(200).optional(),
  deliveryInstructions: z.string().trim().max(500).optional(),
});

/** Frozen variant identity/facts and all owner-reviewed inputs needed to explain this purchase. */
export const nativePurchaseSnapshotSchema = z.strictObject({
  version: z.literal(2), kind: z.literal("native-edition-v1"),
  customerID: id, cartID: id, productID: id, releaseID: id, eventID: id.nullable(),
  productVersion: revision, variantID: id, variantVersion: revision, optionID: id,
  variantTypeID: id, editionLabel: z.string().trim().min(1).max(200),
  ...editionRuleFacts,
  termsRevision: revision, disclosureRevision: revision, fulfillmentRevision: revision, benefitRevision: revision,
  quantity: z.literal(1), currency: z.literal("KRW"), unitAmount: z.int().min(1),
  shippingAmount: z.int().min(0), totalAmount: z.int().min(1),
  orderName: z.string().trim().min(1).max(200),
  shippingAddress: address,
  memberTicketTarget: sharedTicketTarget.optional(),
}).refine((value) => (!value.memberTicketTarget || value.editionEntitlements.freeLaunchTicket) && value.releaseID === value.productID &&
  Number.isSafeInteger(value.unitAmount + value.shippingAmount) &&
  value.totalAmount === value.unitAmount + value.shippingAmount && matchesRecordedEditionRule(value) &&
  value.editionEntitlements.freeLaunchTicket === (value.eventID !== null));

export type NativePurchaseSnapshot = Readonly<z.infer<typeof nativePurchaseSnapshotSchema>>;

export function nativePurchaseSnapshotHash(input: unknown): string {
  const snapshot = nativePurchaseSnapshotSchema.parse(input);
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

const orderInput = z.strictObject({
  id, customer: z.union([id, z.strictObject({ id })]),
  commerceVersion: z.literal("commerce-v1"), commerceAttemptID: id, commerceSnapshot: z.unknown(),
  amount: z.int().min(1), currency: z.literal("KRW"), status: z.literal("processing"),
  fulfillment: z.strictObject({
    status: z.enum(["pending", "packed", "shipped", "delivered", "return-requested", "returned"]).nullable().optional(),
  }).optional(),
});
const paymentInput = z.strictObject({
  id, order: z.union([id, z.strictObject({ id })]), customer: z.union([id, z.strictObject({ id })]),
  status: z.literal("succeeded"), amount: z.int().min(1), currency: z.literal("KRW"),
  nativeSnapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
  providerReference: id.optional(),
});

const relationshipID = (value: string | { id: string }) => typeof value === "string" ? value : value.id;

export const nativeEditionReceiptSchema = z.strictObject({
  receiptVersion: z.literal(1), kind: z.literal("native-edition-receipt"),
  orderID: id, attemptID: id, memberID: id, paymentID: id,
  productName: z.string().trim().min(1).max(200), eventID: id.nullable(),
  status: z.literal("processing"),
  edition: z.strictObject({
    productID: id, releaseID: id, variantID: id, optionID: id, label: z.string().min(1),
  }),
  ...editionRuleFacts,
  quantity: z.literal(1), currency: z.literal("KRW"), unitAmount: z.int().min(1),
  shippingAmount: z.int().min(0), totalAmount: z.int().min(1),
  shippingAddress: address,
  fulfillmentStatus: z.enum(["pending", "packed", "shipped", "delivered", "return-requested", "returned"]).nullable(),
  termsRevision: revision, disclosureRevision: revision, fulfillmentRevision: revision, benefitRevision: revision,
}).refine((value) => value.totalAmount === value.unitAmount + value.shippingAmount &&
  matchesRecordedEditionRule(value) && value.editionEntitlements.freeLaunchTicket === (value.eventID !== null));
export type NativeEditionReceipt = Readonly<z.infer<typeof nativeEditionReceiptSchema>>;

/** Server-only caller must fetch both rows under the same authenticated member principal. */
export function projectNativeEditionReceipt(
  memberID: string, rawOrder: unknown, rawPayment: unknown,
): NativeEditionReceipt | null {
  if (!id.safeParse(memberID).success) return null;
  const order = orderInput.safeParse(rawOrder);
  const payment = paymentInput.safeParse(rawPayment);
  if (!order.success || !payment.success) return null;
  const snapshot = nativePurchaseSnapshotSchema.safeParse(order.data.commerceSnapshot);
  if (!snapshot.success) return null;
  const frozen = snapshot.data;
  const owner = relationshipID(order.data.customer);
  if (owner !== memberID || frozen.customerID !== memberID || frozen.cartID.length === 0 ||
    relationshipID(payment.data.customer) !== memberID ||
    relationshipID(payment.data.order) !== order.data.id || order.data.commerceAttemptID !== payment.data.id ||
    order.data.status !== "processing" || order.data.amount !== frozen.totalAmount ||
    order.data.currency !== frozen.currency || payment.data.amount !== frozen.totalAmount ||
    payment.data.currency !== frozen.currency ||
    payment.data.nativeSnapshotHash !== nativePurchaseSnapshotHash(frozen)) return null;

  const receipt = nativeEditionReceiptSchema.safeParse({
    receiptVersion: 1, kind: "native-edition-receipt",
    orderID: order.data.id, attemptID: order.data.commerceAttemptID, memberID,
    paymentID: payment.data.id, status: order.data.status,
    productName: frozen.orderName, eventID: frozen.eventID,
    edition: {
      productID: frozen.productID, releaseID: frozen.releaseID, variantID: frozen.variantID,
      optionID: frozen.optionID, label: frozen.editionLabel,
    },
    editionRuleVersion: frozen.editionRuleVersion, editionKind: frozen.editionKind,
    maximumQuantity: frozen.maximumQuantity, editionEntitlements: frozen.editionEntitlements,
    quantity: frozen.quantity, currency: frozen.currency, unitAmount: frozen.unitAmount,
    shippingAmount: frozen.shippingAmount, totalAmount: frozen.totalAmount,
    shippingAddress: frozen.shippingAddress,
    fulfillmentStatus: order.data.fulfillment?.status ?? null,
    termsRevision: frozen.termsRevision, disclosureRevision: frozen.disclosureRevision,
    fulfillmentRevision: frozen.fulfillmentRevision, benefitRevision: frozen.benefitRevision,
  });
  return receipt.success ? receipt.data : null;
}
