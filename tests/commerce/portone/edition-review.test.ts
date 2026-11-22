import assert from "node:assert/strict";
import test from "node:test";
import type { PayloadRequest } from "payload";
import { assertPurchaseWithoutPaidReview, PaymentReviewRequired } from "@/lib/commerce/portone/review";
import { paidReviewScope, paymentContradictionScope } from "@/lib/commerce/portone/accounting";
import { nativePurchaseSnapshotSchema } from "@/lib/commerce/native-edition-receipt";
import { commerceSnapshotHash } from "@/lib/commerce/snapshot-hash";

const transactionID = "915de316-e98d-4ca7-9d32-f5cb6785daf0";
const paymentID = transactionID.replaceAll("-", "");
const book = nativePurchaseSnapshotSchema.parse({
  version: 2, kind: "native-edition-v1", customerID: "account", cartID: "book-cart",
  productID: "book", releaseID: "book", eventID: null, productVersion: "1",
  variantID: "sku", variantVersion: "1", optionID: "option", variantTypeID: "type",
  editionLabel: "Book", editionKind: "book-only", editionRuleVersion: 1, maximumQuantity: 1,
  editionEntitlements: { membershipSignet: false, freeLaunchTicket: false },
  termsRevision: "1", disclosureRevision: "1", fulfillmentRevision: "1", benefitRevision: "1",
  quantity: 1, currency: "KRW", unitAmount: 35000, shippingAmount: 0, totalAmount: 35000, orderName: "Book",
  shippingAddress: { country: "KR", recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture" },
});

for (const mode of ["paid", "contradiction"] as const) {
  test(`a book-only ${mode} case holds the same product but not a separate Signet purchase`, async () => {
    const { customerID, cartID, productID, variantID, totalAmount } = book;
    const snapshotHash = commerceSnapshotHash(book);
    const identity = { transactionID, paymentID, customerID, cartID, snapshotHash };
    const evidence = mode === "paid"
      ? { scope: paidReviewScope(transactionID), state: { identity: { ...identity, startedAt: 1 }, eventID: "fixture", reason: "review-required", recordedAt: 2 } }
      : { scope: paymentContradictionScope(transactionID, 1), state: { identity, sequence: 1, evidenceID: "fixture", afterDispositions: 0, recordedAt: 2 } };
    const row = {
      id: transactionID, status: "failed", customer: customerID, cart: cartID, amount: totalAmount, currency: "KRW",
      paymentMethod: "portone", commerceResolutionConflict: mode === "contradiction",
      items: [{ product: productID, variant: variantID, quantity: 1 }],
      portone: { paymentID, snapshot: book, snapshotHash, prepareKey: "a".repeat(64), storeID: "test", channelKey: "test" },
    };
    const req = { payload: { find: async ({ collection, where }: { collection: string; where: unknown }) => {
      const scopePrefix = evidence.scope.split(transactionID)[0];
      const docs = collection === "transactions" ? [row] : JSON.stringify(where).includes(scopePrefix) ? [evidence] : [];
      return { docs, totalDocs: docs.length };
    } } } as unknown as PayloadRequest;
    await assert.rejects(assertPurchaseWithoutPaidReview(req, { ...book, cartID: "new-book-cart" }), PaymentReviewRequired);
    await assert.doesNotReject(assertPurchaseWithoutPaidReview(req, {
      customerID, cartID: "signet-cart", productID: "signet-product", eventID: "launch-event",
    }));
  });
}
