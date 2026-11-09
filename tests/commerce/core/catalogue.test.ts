import assert from "node:assert/strict";
import test from "node:test";
import type { Payload, PayloadRequest } from "payload";
import { buildCommerceSnapshot, commerceProductSchema, commercePublicationSchema, loadCommerceOffer } from "../../../src/lib/commerce/catalogue";

test("catalogue does not invent shipping fees, stock, approval or dispatch facts", () => {
  const doc = { id: "p", title: "Coin", _status: "published", publicationApproved: true, event: "e", saleStartsAt: "2026-01-01T00:00:00Z", saleEndsAt: "2027-01-01T00:00:00Z", dispatchSchedule: "Owner-approved schedule", shippingFeeKRW: 0, reservedQuantity: 0, inventory: 2, priceInKRWEnabled: true, priceInKRW: 1000, updatedAt: "v1", description: "Physical coin", images: [{ image: "img" }] };
  assert.equal(commerceProductSchema.safeParse(doc).success, true);
  for (const changed of [{ shippingFeeKRW: undefined }, { inventory: undefined }, { publicationApproved: false }, { dispatchSchedule: "" }]) assert.equal(commerceProductSchema.safeParse({ ...doc, ...changed }).success, false);
});
test("unapproved or draft legal/fulfillment content cannot open public commerce", () => {
  assert.equal(commercePublicationSchema.safeParse({ publicationApproved: true, _status: "draft" }).success, false);
  assert.equal(commercePublicationSchema.safeParse({}).success, false);
});

test("missing CMS publication never falls back to legacy/static commerce facts", async () => {
  let productReads = 0;
  const payload = { findGlobal: async () => ({}), find: async () => { productReads++; return { docs: [] }; } } as unknown as Payload;
  assert.equal(await loadCommerceOffer(payload), null);
  assert.equal(productReads, 0);
});

test("CMS quote uses admission capacity and canonical price, never submitted subtotal", async () => {
  const policy = { effectiveDate: "2020-01-01", sections: [{ heading: "Test policy", paragraphs: ["Test fixture, not approved public policy."] }] };
  const publication = { _status: "published", publicationApproved: true, physicalProductApproved: true, fulfillmentReady: true,
    addressRetentionApproved: true, shippingCountries: ["KR"], disclosure: { seller: { name: "Test seller", registrationNumber: "123-45-67890", representative: "Test", address: "Test address", phone: "02-1234-5678" }, policies: { terms: policy, privacy: policy, refund: policy } } };
  const product = { id: "p", title: "Coin", description: "Physical coin", images: [{ image: "image" }], _status: "published", publicationApproved: true,
    event: "e", saleStartsAt: "2000-01-01T00:00:00Z", saleEndsAt: "2100-01-01T00:00:00Z", dispatchSchedule: "Approved fixture",
    shippingFeeKRW: 2500, inventory: 8, reservedQuantity: 0, priceInKRWEnabled: true, priceInKRW: 1000, updatedAt: "v1" };
  const event = { id: "e", name: "Event", publicationApproved: true, partIStartsAt: "2027-02-01T00:00:00Z", updatedAt: "v2", capacity: 3, committedQuantity: 2, reservedQuantity: 0 };
  const payload = { findGlobal: async () => publication, find: async () => ({ docs: [product] }), findByID: async () => event } as unknown as Payload;
  const offer = await loadCommerceOffer(payload, undefined, "p", Date.parse("2026-11-09T00:00:00Z"));
  assert.equal(offer?.availableQuantity, 1);
  const req = { payload, user: { id: "owner", collection: "users" } } as unknown as PayloadRequest;
  const cart = { id: "cart", customer: "owner", currency: "KRW", items: [{ product: "p", quantity: 1 }], subtotal: 1 };
  const snapshot = await buildCommerceSnapshot({ req, cart, shippingAddress: { country: "KR", recipientName: "Test", phone: "01012345678", postalCode: "12345", addressLine1: "Test address" } });
  assert.equal(snapshot.totalAmount, 3500);
  assert.equal(snapshot.unitAmount, 1000);
  assert.equal(snapshot.eventVersion, "v2");
  await assert.rejects(buildCommerceSnapshot({ req, cart: { ...cart, customer: "other" }, shippingAddress: snapshot.shippingAddress }));
});
