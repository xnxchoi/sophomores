import assert from "node:assert/strict";
import { test } from "node:test";
import {
  nativePurchaseSnapshotHash,
  projectNativeEditionReceipt,
} from "@/lib/commerce/native-edition-receipt";

const memberID = "member-1";
const snapshot = {
  version: 2,
  kind: "native-edition-v1",
  customerID: memberID,
  cartID: "cart-1",
  productID: "product-1",
  releaseID: "product-1",
  eventID: null,
  productVersion: "product-r1",
  variantID: "variant-book-only",
  variantVersion: "variant-r1",
  optionID: "option-book-only",
  variantTypeID: "edition-type",
  editionLabel: "Book",
  editionKind: "book-only",
  editionRuleVersion: 1,
  editionEntitlements: { membershipSignet: false, freeLaunchTicket: false },
  maximumQuantity: 1,
  termsRevision: "book-terms-r1",
  disclosureRevision: "seller-r1",
  fulfillmentRevision: "dispatch-r1",
  benefitRevision: "none-r1",
  quantity: 1,
  currency: "KRW",
  unitAmount: 35000,
  shippingAmount: 3000,
  totalAmount: 38000,
  orderName: "Book",
  shippingAddress: {
    country: "KR",
    recipientName: "Preview Member",
    phone: "01012345678",
    postalCode: "12345",
    addressLine1: "Preview address",
  },
} as const;

const order = {
  id: "order-1",
  customer: memberID,
  commerceVersion: "commerce-v1",
  commerceAttemptID: "payment-1",
  commerceSnapshot: snapshot,
  amount: snapshot.totalAmount,
  currency: "KRW",
  status: "processing",
  fulfillment: { status: "pending" },
} as const;

const payment = {
  id: "payment-1",
  order: order.id,
  customer: memberID,
  status: "succeeded",
  amount: snapshot.totalAmount,
  currency: "KRW",
  nativeSnapshotHash: nativePurchaseSnapshotHash(snapshot),
} as const;

test("projects a same-member succeeded book-only receipt from frozen facts", () => {
  assert.deepEqual(projectNativeEditionReceipt(memberID, order, payment), {
    receiptVersion: 1,
    kind: "native-edition-receipt",
    orderID: "order-1",
    attemptID: "payment-1",
    memberID,
    paymentID: "payment-1",
    status: "processing",
    productName: snapshot.orderName,
    eventID: null,
    edition: {
      productID: "product-1",
      releaseID: "product-1",
      variantID: "variant-book-only",
      optionID: "option-book-only",
      label: "Book",
    },
    editionKind: "book-only",
    editionRuleVersion: 1,
    editionEntitlements: { membershipSignet: false, freeLaunchTicket: false },
    maximumQuantity: 1,
    quantity: 1,
    currency: "KRW",
    unitAmount: 35000,
    shippingAmount: 3000,
    totalAmount: 38000,
    shippingAddress: snapshot.shippingAddress,
    fulfillmentStatus: "pending",
    termsRevision: "book-terms-r1",
    disclosureRevision: "seller-r1",
    fulfillmentRevision: "dispatch-r1",
    benefitRevision: "none-r1",
  });
});

test("legacy or incomplete current order data cannot masquerade as a native receipt", () => {
  assert.equal(projectNativeEditionReceipt(memberID, { ...order, commerceSnapshot: {} }, payment), null);
  assert.equal(projectNativeEditionReceipt(memberID, {
    ...order, commerceSnapshot: { version: 1, customerID: memberID },
  }, payment), null);
  assert.equal(projectNativeEditionReceipt(memberID, {
    ...order, commerceSnapshot: { ...snapshot, editionLabel: undefined },
  }, payment), null);
  assert.equal(projectNativeEditionReceipt(memberID, order, { ...payment, nativeSnapshotHash: "bad" }), null);
});

test("missing and unknown rule versions and forged benefit facts fail closed", () => {
  for (const changed of [
    { editionRuleVersion: undefined },
    { editionRuleVersion: 2 },
    { editionEntitlements: undefined },
    { editionEntitlements: { membershipSignet: true, freeLaunchTicket: true } },
    { maximumQuantity: 3 },
    { eventID: "unowed-event" },
  ]) {
    const invalid = { ...snapshot, ...changed };
    assert.throws(() => nativePurchaseSnapshotHash(invalid));
    assert.equal(projectNativeEditionReceipt(memberID, { ...order, commerceSnapshot: invalid }, payment), null);
  }
});

for (const [editionKind, unitAmount] of [["personal", 82000], ["premium", 329000]] as const) {
  test(`frozen ${editionKind} receipt describes one owed Signet and Member Ticket`, () => {
    const paid = {
      ...snapshot, editionKind, unitAmount, eventID: "launch-event",
      totalAmount: unitAmount + snapshot.shippingAmount,
      editionEntitlements: { membershipSignet: true, freeLaunchTicket: true },
    };
    const paidOrder = { ...order, commerceSnapshot: paid, amount: paid.totalAmount };
    const paidEvidence = { ...payment, amount: paid.totalAmount, nativeSnapshotHash: nativePurchaseSnapshotHash(paid) };
    const receipt = projectNativeEditionReceipt(memberID, paidOrder, paidEvidence);
    assert.ok(receipt);
    assert.equal(receipt.editionRuleVersion, 1);
    assert.equal(receipt.editionKind, editionKind);
    assert.equal(receipt.unitAmount, unitAmount);
    assert.equal(receipt.eventID, "launch-event");
    assert.deepEqual(receipt.editionEntitlements, { membershipSignet: true, freeLaunchTicket: true });
    assert.throws(() => nativePurchaseSnapshotHash({ ...paid, eventID: null }));
    assert.equal(projectNativeEditionReceipt(memberID, paidOrder, { ...paidEvidence, nativeSnapshotHash: payment.nativeSnapshotHash }), null);
  });
}

test("owner, payment, attempt, charge and status must all agree", () => {
  assert.equal(projectNativeEditionReceipt("other-member", order, payment), null);
  assert.equal(projectNativeEditionReceipt(memberID, { ...order, customer: "other-member" }, payment), null);
  assert.equal(projectNativeEditionReceipt(memberID, order, { ...payment, customer: "other-member" }), null);
  assert.equal(projectNativeEditionReceipt(memberID, { ...order, commerceAttemptID: "other-attempt" }, payment), null);
  assert.equal(projectNativeEditionReceipt(memberID, { ...order, status: "pending" }, payment), null);
  assert.equal(projectNativeEditionReceipt(memberID, { ...order, amount: 1 }, payment), null);
  assert.equal(projectNativeEditionReceipt(memberID, order, { ...payment, amount: 1 }), null);
  assert.equal(projectNativeEditionReceipt(memberID, order, { ...payment, status: "pending" }), null);
});

test("snapshot identity and arithmetic are strict; untrusted QR or private notes are never projected", () => {
  assert.equal(projectNativeEditionReceipt(memberID, {
    ...order, commerceSnapshot: { ...snapshot, totalAmount: 1 },
  }, payment), null);
  assert.equal(projectNativeEditionReceipt(memberID, {
    ...order, commerceSnapshot: { ...snapshot, releaseID: "another-release" },
  }, payment), null);
  const leaked = projectNativeEditionReceipt(memberID, {
    ...order,
    commerceSnapshot: { ...snapshot, rawQr: "secret", privateNote: "not in receipt" },
  }, payment);
  assert.equal(leaked, null);
});
