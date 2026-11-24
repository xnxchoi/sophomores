import { z } from "zod";
import { commerceSnapshotSchema, matchesPurchaseCharge, MEMBERSHIP_RELEASE, purchaseChargeFields } from "./contracts";
import { guestTicketTarget, sharedTicketMode, SHARED_GUEST_LIMIT } from "./event-tickets";
import { nativePurchaseSnapshotSchema } from "./native-edition-receipt";
import { relationshipID } from "./_shared/transaction";

// This contract is deliberately not emitted by checkout until a Guest offer is approved.
export const guestPurchaseSnapshotSchema = z.strictObject({
  version: z.literal(3), kind: z.literal("guest-ticket-v1"), ...purchaseChargeFields, releaseID: z.string().min(1).max(128),
  shippingAmount: z.literal(0), ticketTarget: guestTicketTarget,
}).refine((value) => matchesPurchaseCharge(value) && (!sharedTicketMode(value.ticketTarget) || value.accountLimit === SHARED_GUEST_LIMIT) && value.releaseID === value.productID && value.productID !== MEMBERSHIP_RELEASE);

export const purchaseSnapshotSchema = z.union([commerceSnapshotSchema, nativePurchaseSnapshotSchema, guestPurchaseSnapshotSchema]);
export type PurchaseSnapshot = Readonly<z.infer<typeof purchaseSnapshotSchema>>;

export function purchaseAllowance(snapshot: Pick<PurchaseSnapshot, "productID" | "eventID"> & { version?: number }) {
  return reservationAllowance(snapshot.productID, snapshot.eventID, snapshot.version === 3);
}

export function reservationAllowance(productID: string, eventID: string | null, guest = false) {
  return guest ? `guest:${eventID}` : eventID === null ? `book:${productID}` : MEMBERSHIP_RELEASE;
}

export const optionalRelationshipID = (value: unknown) => value == null ? null : relationshipID(value);
