import { createHash } from "node:crypto";
import { commerceSnapshotSchema, type CommerceSnapshot } from "./contracts";

/** Strict parsing fixes key order and excludes untrusted data before signing charge identity. */
export function commerceSnapshotHash(snapshot: CommerceSnapshot): string {
  return createHash("sha256").update(JSON.stringify(commerceSnapshotSchema.parse(snapshot))).digest("hex");
}
