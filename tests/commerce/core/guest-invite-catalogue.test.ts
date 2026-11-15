import assert from "node:assert/strict";
import test from "node:test";
import type { Payload, PayloadRequest } from "payload";
import { buildCommerceSnapshot, loadCommerceOffer } from "../../../src/lib/commerce/catalogue";
import { commerceSnapshotSchema } from "../../../src/lib/commerce/contracts";
import { guestInviteActiveKey } from "../../../src/lib/commerce/guest-invites";
import { commerceSnapshotHash } from "../../../src/lib/commerce/snapshot-hash";

const address = { country: "KR", recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture only", addressLine2: "B1" } as const;
const physical = { version: 1, customerID: "c1", eventID: "e1", productID: "p1", releaseID: "p1", cartID: "cart1", quantity: 1, currency: "KRW",
  unitAmount: 10000, shippingAmount: 3000, totalAmount: 13000, orderName: "Fixture", productVersion: "v1", eventVersion: "v2", shippingAddress: address } as const;
const guest = { version: 1, customerID: "c1", eventID: "e1", productID: "g1", releaseID: "g1", cartID: "cart1", quantity: 1, currency: "KRW",
  unitAmount: 10000, shippingAmount: 0, totalAmount: 10000, orderName: "Guest invite", productVersion: "v1", eventVersion: "v2", guestInviteID: "invite-1" } as const;

test("historical physical snapshots keep their exact charge hash", () => {
  // Computed on the base commit f6c402f before guest invites existed.
  assert.equal(commerceSnapshotHash(physical as never), "850d6230844ac0f11a8a36e9c404ca1503b5df84f18a90c0fee85d8243c36f3f");
});

test("a guest-invite snapshot names its invite, carries no address and charges no shipping", () => {
  assert.equal(commerceSnapshotSchema.safeParse(guest).success, true);
  assert.equal(commerceSnapshotHash(guest as never), commerceSnapshotHash(commerceSnapshotSchema.parse(guest) as never));
  const addressless = { ...physical, shippingAddress: undefined };
  for (const invalid of [addressless, { ...guest, shippingAddress: address }, { ...guest, shippingAmount: 3000, totalAmount: 13000 },
    { ...guest, quantity: 2, totalAmount: 20000 }, { ...guest, guestInviteID: "" }]) {
    assert.equal(commerceSnapshotSchema.safeParse(invalid).success, false, JSON.stringify(invalid));
  }
});

const policy = { effectiveDate: "2020-01-01", sections: [{ heading: "Test policy", paragraphs: ["Test fixture, not approved public policy."] }] };
const publication = { _status: "published", publicationApproved: true, physicalProductApproved: true, fulfillmentReady: true, addressRetentionApproved: true,
  shippingCountries: ["KR"], disclosure: { seller: { name: "Test seller", registrationNumber: "123-45-67890", representative: "Test", address: "Test address", phone: "02-1234-5678" }, policies: { terms: policy, privacy: policy, refund: policy } } };
const membership = { id: "p", title: "Membership", description: "Membership card", images: [{ image: "image" }], _status: "published", publicationApproved: true,
  event: "e", saleStartsAt: "2000-01-01T00:00:00Z", saleEndsAt: "2100-01-01T00:00:00Z", dispatchSchedule: "Approved fixture",
  shippingFeeKRW: 2500, inventory: 8, reservedQuantity: 0, priceInKRWEnabled: true, priceInKRW: 1000, updatedAt: "v1", productKind: "membership" };
const guestProduct = { ...membership, id: "g", title: "Guest invite", description: "One guest entry", shippingFeeKRW: 0, dispatchSchedule: "Emailed by Unlock",
  priceInKRW: 20000, inventory: 50, productKind: "guest_invite" };
const fullEvent = { id: "e", name: "Event", publicationApproved: true, partIStartsAt: "2027-02-01T00:00:00Z", updatedAt: "v2", capacity: 3, committedQuantity: 2, reservedQuantity: 1 };

type Where = { and?: Where[] } & Record<string, unknown>;
function matches(doc: Record<string, unknown>, where: Where): boolean {
  if (where.and) return where.and.every((part) => matches(doc, part));
  return Object.entries(where).every(([field, condition]) => doc[field] === (condition as { equals: unknown }).equals);
}
function catalogue(products: Record<string, unknown>[], invites: Record<string, unknown>[] = []) {
  return { findGlobal: async () => publication, findByID: async () => fullEvent,
    find: async ({ collection, where, limit }: { collection: string; where: Where; limit: number }) => {
      const docs = (collection === "products" ? products : collection === "commerce-guest-invites" ? invites : []).filter((doc) => matches(doc, where));
      return { docs: docs.slice(0, limit), totalDocs: docs.length };
    } } as unknown as Payload;
}

test("the shop shows the same membership offer when a guest-invite product is also on sale", async () => {
  const now = Date.parse("2026-11-16T00:00:00Z");
  const alone = await loadCommerceOffer(catalogue([membership]), undefined, undefined, now);
  const beside = await loadCommerceOffer(catalogue([membership, guestProduct]), undefined, undefined, now);
  assert.ok(alone);
  assert.deepEqual(beside, alone);
  assert.equal(beside?.productID, "p");
  assert.equal(beside?.priceKRW, 1000);
  assert.equal(beside?.shippingFeeKRW, 2500);
  // Today's shop (no explicit product) still refuses to guess between two membership releases.
  assert.equal(await loadCommerceOffer(catalogue([membership, { ...membership, id: "p2" }]), undefined, undefined, now), null);
});

test("an invite's own hold does not block its checkout quote", async () => {
  const now = Date.parse("2026-11-16T00:00:00Z");
  const offer = await loadCommerceOffer(catalogue([membership, guestProduct]), undefined, "g", now);
  assert.equal(offer?.kind, "guest_invite");
  assert.equal(offer?.availableQuantity, 50, "event capacity is held by the invite, so only stock limits the quote");
  assert.equal((await loadCommerceOffer(catalogue([membership, guestProduct]), undefined, "p", now))?.availableQuantity, 0, "the event is full for new members");
});

test("a guest-invite checkout snapshot binds the member's open invite and takes no shipping address", async () => {
  const invite = { id: "invite-1", inviter: "owner", payer: "member", product: "g", event: "e", state: "pending_payment", activeKey: guestInviteActiveKey("owner", "g"),
    holdExpiresAt: new Date(Date.now() + 60_000).toISOString() };
  const payload = catalogue([membership, guestProduct], [invite]);
  const req = { payload, user: { id: "owner", collection: "users" } } as unknown as PayloadRequest;
  const cart = { id: "cart", customer: "owner", currency: "KRW", items: [{ product: "g", quantity: 1 }], subtotal: 1 };
  const snapshot = await buildCommerceSnapshot({ req, cart });
  assert.equal(snapshot.guestInviteID, "invite-1");
  assert.equal(snapshot.shippingAddress, undefined);
  assert.equal(snapshot.shippingAmount, 0);
  assert.equal(snapshot.totalAmount, 20000);
  await assert.rejects(buildCommerceSnapshot({ req, cart, shippingAddress: address }), /address/i);
  const expired = { ...invite, holdExpiresAt: new Date(Date.now() - 1000).toISOString() };
  await assert.rejects(buildCommerceSnapshot({ req: { ...req, payload: catalogue([membership, guestProduct], [expired]) } as PayloadRequest, cart }), /hold|invite/i);
  await assert.rejects(buildCommerceSnapshot({ req: { ...req, payload: catalogue([membership, guestProduct]) } as PayloadRequest, cart }), /invite/i);
  // The membership offer still needs its shipping address.
  await assert.rejects(buildCommerceSnapshot({ req, cart: { ...cart, items: [{ product: "p", quantity: 1 }] } }));
});
