import { createHash } from "node:crypto";
import { purchaseSnapshotSchema, type PurchaseSnapshot } from "./purchase-snapshot";

/** Strict parsing fixes key order and excludes untrusted data before signing charge identity. */
export function commerceSnapshotHash(snapshot: PurchaseSnapshot): string {
  return createHash("sha256").update(JSON.stringify(purchaseSnapshotSchema.parse(snapshot))).digest("hex");
}
