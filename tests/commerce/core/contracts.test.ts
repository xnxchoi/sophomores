import assert from "node:assert/strict";
import test from "node:test";
import { commerceSnapshotSchema, shippingAddressSchema } from "../../../src/lib/commerce/contracts";

test("shipping rejects foreign coverage, unknown properties and incomplete recipient details", () => {
  const valid = { country: "KR", recipientName: "Recipient", phone: "01012345678", postalCode: "12345", addressLine1: "Seoul street", addressLine2: "101" };
  assert.equal(shippingAddressSchema.safeParse(valid).success, true);
  for (const changed of [{ country: "US" }, { postalCode: "" }, { recipientName: "" }, { extra: "private" }]) {
    assert.equal(shippingAddressSchema.safeParse({ ...valid, ...changed }).success, false);
  }
});

test("charge snapshots enforce exact arithmetic and release identity", () => {
  const snapshot = { version: 1, customerID: "c", cartID: "cart", productID: "p", eventID: "e", releaseID: "p", quantity: 2, currency: "KRW", unitAmount: 1000, shippingAmount: 2500, totalAmount: 4500, orderName: "Physical coin", productVersion: "2026-11-09T00:00:00.000Z", eventVersion: "2026-11-09T00:00:00.000Z", shippingAddress: { country: "KR", recipientName: "Recipient", phone: "01012345678", postalCode: "12345", addressLine1: "Seoul street", addressLine2: "101" } };
  assert.equal(commerceSnapshotSchema.safeParse(snapshot).success, true);
  for (const changed of [{ totalAmount: 1 }, { releaseID: "other" }, { quantity: 4 }, { unitAmount: 1.5 }, { currency: "USD" }]) {
    assert.equal(commerceSnapshotSchema.safeParse({ ...snapshot, ...changed }).success, false);
  }
});
