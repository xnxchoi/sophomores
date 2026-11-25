import assert from "node:assert/strict";
import test from "node:test";
import type { PayloadRequest } from "payload";
import { assertPurchaseWithoutPaidReview, PaymentReviewRequired } from "@/lib/commerce/portone/review";
import { paidReviewScope, paymentContradictionScope } from "@/lib/commerce/portone/accounting";
import { nativePurchaseSnapshotSchema } from "@/lib/commerce/native-edition-receipt";
import { guestPurchaseSnapshotSchema } from "@/lib/commerce/purchase-snapshot";
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
      version: 2, customerID, cartID: "signet-cart", productID: "signet-product", eventID: "launch-event",
    }));
  });
}

const eventID = "launch";
const lock = "0x" + "b".repeat(40);
const guest = guestPurchaseSnapshotSchema.parse({
  version: 3, kind: "guest-ticket-v1", customerID: book.customerID, cartID: "guest-cart",
  productID: "offer", releaseID: "offer", eventID, productVersion: "1", eventVersion: "1",
  quantity: 1, accountLimit: 2, currency: "KRW", unitAmount: 10_000, shippingAmount: 0, totalAmount: 10_000,
  orderName: "Guest", shippingAddress: book.shippingAddress,
  ticketTarget: { chainID: 137, lock, mode: "shared" },
});
const signet = nativePurchaseSnapshotSchema.parse({
  ...book, cartID: "signet-cart", productID: "offer", releaseID: "offer", eventID,
  editionLabel: "Personal", editionKind: "personal",
  editionEntitlements: { membershipSignet: true, freeLaunchTicket: true },
  unitAmount: 82_000, totalAmount: 82_000,
});

for (const [prior, related, independent] of [
  [guest, { ...guest, cartID: "next-guest", productID: "updated-offer" }, signet],
  [signet, { ...signet, cartID: "next-signet", eventID: "other-event", productID: "another-edition" }, guest],
] as const) {
  for (const mode of ["paid", "contradiction"] as const) {
    test(`a ${mode} hold for snapshot v${prior.version} follows its allowance, not a shared product ID`, async () => {
      const snapshotHash = commerceSnapshotHash(prior);
      const identity = { transactionID, paymentID, customerID: prior.customerID, cartID: prior.cartID, snapshotHash };
      const evidence = mode === "paid"
        ? { scope: paidReviewScope(transactionID), state: { identity: { ...identity, startedAt: 1 }, eventID: "fixture", reason: "review-required", recordedAt: 2 } }
        : { scope: paymentContradictionScope(transactionID, 1), state: { identity, sequence: 1, evidenceID: "fixture", afterDispositions: 0, recordedAt: 2 } };
      const row = {
        id: transactionID, status: "failed", customer: prior.customerID, cart: prior.cartID,
        amount: prior.totalAmount, currency: "KRW", paymentMethod: "portone",
        commerceResolutionConflict: mode === "contradiction",
        items: [{ product: prior.productID, quantity: 1, ...(prior.version === 2 ? { variant: prior.variantID } : {}) }],
        portone: { paymentID, snapshot: prior, snapshotHash, prepareKey: "a".repeat(64), storeID: "test", channelKey: "test" },
      };
      const req = { payload: { find: async ({ collection, where }: { collection: string; where: unknown }) => {
        const scopePrefix = evidence.scope.split(transactionID)[0];
        const docs = collection === "transactions" ? [row] : JSON.stringify(where).includes(scopePrefix) ? [evidence] : [];
        return { docs, totalDocs: docs.length };
      } } } as unknown as PayloadRequest;
      await assert.rejects(assertPurchaseWithoutPaidReview(req, related), PaymentReviewRequired);
      await assert.doesNotReject(assertPurchaseWithoutPaidReview(req, independent));
      if (prior.version === 3) await assert.doesNotReject(assertPurchaseWithoutPaidReview(req, {
        ...prior, eventID: "different-event", cartID: "different-event-cart",
      }));
      // Reusing the same cart still cannot bypass unresolved payment review.
      await assert.rejects(assertPurchaseWithoutPaidReview(req, { ...independent, cartID: prior.cartID }), PaymentReviewRequired);
    });
  }
}
