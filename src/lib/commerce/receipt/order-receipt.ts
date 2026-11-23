import { z } from "zod";
import { commerceSnapshotSchema } from "../contracts";
import { nativePurchaseSnapshotSchema } from "../native-edition-receipt";
import { receiptDeliverySchema } from "./delivery";

// Guest-ticket v3 needs its own projection; it is not a membership or shipping receipt.
const receiptSnapshotSchema = z.union([commerceSnapshotSchema, nativePurchaseSnapshotSchema]);
const orderSchema = z.object({
  id: z.uuid(), customer: z.string().min(1), commerceVersion: z.literal("commerce-v1"),
  commerceSnapshot: receiptSnapshotSchema, amount: z.int().positive(), currency: z.literal("KRW"),
  status: z.enum(["processing", "completed", "cancelled", "refunded"]),
  createdAt: z.iso.datetime({ offset: true }),
  fulfillment: receiptDeliverySchema.shape.fulfillment,
});

/** Project stored order facts only; never fall back to today's catalogue or legacy receipts. */
export function projectOrderReceipt(raw: unknown, orderID: string) {
  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success) return null;
  const order = parsed.data;
  const snapshot = order.commerceSnapshot;
  if (order.id !== orderID || order.customer !== snapshot.customerID ||
    order.amount !== snapshot.totalAmount || order.currency !== snapshot.currency) return null;
  const { recipientName, phone, postalCode, addressLine1, addressLine2, country } = snapshot.shippingAddress;
  return {
    id: order.id, createdAt: order.createdAt, status: order.status,
    name: snapshot.orderName, edition: snapshot.version === 2 ? snapshot.editionLabel : null,
    currency: snapshot.currency, quantity: snapshot.quantity, unitAmount: snapshot.unitAmount,
    shippingAmount: snapshot.shippingAmount, totalAmount: snapshot.totalAmount,
    // Current commerce v1 is the membership release, not a pre-launch receipt.
    benefits: snapshot.version === 2 ? snapshot.editionEntitlements : { membershipSignet: true, freeLaunchTicket: true },
    address: { recipientName, phone, postalCode, addressLine1, addressLine2, country },
    fulfillment: order.fulfillment ?? null,
  };
}

export type OrderReceipt = NonNullable<ReturnType<typeof projectOrderReceipt>>;

/** Never serialize delivery details in the initial page or its RSC payload. */
export function receiptWithoutDelivery({ address: _address, fulfillment: _fulfillment, ...receipt }: OrderReceipt) {
  return receipt;
}

const recordStatus = z.enum(["processing", "completed", "cancelled", "refunded", "pending", "paid", "held"]);
const recordAmount = z.int().min(0);

/** An accessible order record is not proof that a customer receipt can be produced. */
export function projectOrderRecord(order: {
  id: string; commerceVersion?: unknown; createdAt?: unknown; status?: unknown;
  amount?: unknown; totalAmount?: unknown; currency?: unknown;
}) {
  const legacy = order.commerceVersion === "legacy";
  const rawAmount = legacy ? order.totalAmount : order.commerceVersion === "commerce-v1" ? order.amount : null;
  return {
    id: order.id, legacy,
    createdAt: z.iso.datetime({ offset: true }).safeParse(order.createdAt).data ?? null,
    status: recordStatus.safeParse(order.status).data ?? null,
    amount: recordAmount.safeParse(rawAmount).data ?? null,
    currency: z.enum(["KRW", "USD"]).safeParse(order.currency).data ?? null,
  };
}

export type OrderRecord = ReturnType<typeof projectOrderRecord>;
