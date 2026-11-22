import { z } from "zod";
import { commerceSnapshotSchema, MEMBERSHIP_RELEASE } from "./contracts";
import { nativePurchaseSnapshotSchema } from "./native-edition-receipt";
import { relationshipID } from "./_shared/transaction";

export const purchaseSnapshotSchema = z.union([commerceSnapshotSchema, nativePurchaseSnapshotSchema]);
export type PurchaseSnapshot = Readonly<z.infer<typeof purchaseSnapshotSchema>>;

export function purchaseAllowance(snapshot: Pick<PurchaseSnapshot, "productID" | "eventID">) {
  return reservationAllowance(snapshot.productID, snapshot.eventID);
}

export function reservationAllowance(productID: string, eventID: string | null) {
  return eventID === null ? `book:${productID}` : MEMBERSHIP_RELEASE;
}

export const optionalRelationshipID = (value: unknown) => value == null ? null : relationshipID(value);
