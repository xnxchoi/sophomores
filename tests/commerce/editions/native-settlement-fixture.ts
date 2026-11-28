import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { createLocalReq, type CollectionSlug, type Payload, type TypedUser } from "payload";
import type { Pool } from "pg";
import { loadCommerceEditionOffer, loadPublishedCommerceEditions } from "../../../src/lib/commerce/editions";
import { nativePurchaseSnapshotSchema } from "../../../src/lib/commerce/native-edition-receipt";
import { runReconciliation } from "../../../src/lib/commerce/portone/admission";
import { createResultEndpoint } from "../../../src/lib/commerce/portone/result";
import { assertPaymentRiskReviewed } from "../../../src/lib/commerce/portone/review";
import { confirmation, initiateThroughEndpoint } from "../core/payment-postgres-fixture";

export const editions = [
  { kind: "book-only", title: "Book only", price: 35_000, bundle: false },
  { kind: "personal", title: "Édition personnelle", price: 82_000, bundle: true },
  { kind: "premium", title: "Premium", price: 329_000, bundle: true },
] as const;
export type Edition = typeof editions[number];
const shippingAmount = 3_000;
const shippingAddress = {
  country: "KR", recipientName: "Fixture reader", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture only",
} as const;
const at = (offset: number) => new Date(Date.now() + offset).toISOString();

// Fixture writes only: configure CMS catalogue, fresh member and unpurchased cart.
// Never manufacture a payment, order, reservation or grant for a native purchase.
async function seed(payload: Payload, collection: string, data: Record<string, unknown>) {
  const id = randomUUID();
  const now = at(0);
  await payload.db.create({ collection: collection as CollectionSlug, customID: id, data: { ...data, createdAt: now, updatedAt: now } });
  return id;
}

export async function seedMember(payload: Payload) {
  const email = `${randomUUID()}@fixture.invalid`;
  const id = await seed(payload, "users", { email, name: "Fixture reader", emailVerified: true, membershipStatus: "applicant" });
  return { id, email, collection: "users", emailVerified: true, membershipStatus: "applicant" } as TypedUser;
}

export async function seedEvent(payload: Payload, name: string) {
  return seed(payload, "commerce-events", {
    name, publicationApproved: true, capacity: 10, transportCapacity: 10, reservedQuantity: 0, committedQuantity: 0,
    partIStartsAt: at(3_600_000), partIEndsAt: at(7_200_000), claimCutoffAt: at(1_800_000),
  });
}

export async function seedNativeCart(payload: Payload, user: TypedUser, edition: Edition, eventID: string | null, maximumPerPerson?: number | null) {
  const mediaID = await seed(payload, "media", { filename: `${randomUUID()}.png`, mimeType: "image/png" });
  const variantTypeID = await seed(payload, "variantTypes", { name: "edition", label: "Edition" });
  const optionID = await seed(payload, "variantOptions", { variantType: variantTypeID, label: edition.title, value: edition.kind });
  const productID = await seed(payload, "products", {
    commerceModel: "native-edition-v2", title: edition.title, description: "Synthetic approved edition",
    _status: "published", publicationApproved: true, enableVariants: false, variantTypes: [variantTypeID],
    maximumPerPerson,
    images: [{ id: randomUUID(), image: mediaID }], event: eventID,
    saleStartsAt: at(-60_000), saleEndsAt: at(3_600_000), dispatchSchedule: "Fixture", shippingFeeKRW: shippingAmount,
    // Distinct decoy price/stock make accidental use of legacy parent fields observable.
    priceInKRWEnabled: true, priceInKRW: edition.price + 9_000, inventory: 99, reservedQuantity: 0,
  });
  const variantID = await seed(payload, "variants", {
    product: productID, title: edition.title, options: [optionID], _status: "published", publicationApproved: true,
    priceInKRWEnabled: true, priceInKRW: edition.price, inventory: 10,
  });
  const cartID = await seed(payload, "carts", {
    customer: String(user.id), currency: "KRW", subtotal: edition.price,
    items: [{ id: randomUUID(), product: productID, variant: variantID, quantity: 1 }],
  });
  const offer = await loadCommerceEditionOffer(payload, productID);
  if (!offer) {
    const found = await loadPublishedCommerceEditions(payload, undefined, productID);
    assert.fail(`fixture must expose a real approved E1 offer: ${found.status === "unavailable" ? found.reason
      : JSON.stringify(found.editions.map(row => ({ key: row.value, price: row.priceKRW })))}`);
  }
  assert.deepEqual([offer.productID, offer.title, offer.edition.variantID, offer.priceKRW, offer.maximumQuantity,
    offer.editionEntitlements], [productID, edition.title, variantID, edition.price, 1,
    { membershipSignet: edition.bundle, freeLaunchTicket: edition.bundle }]);
  return { user, customerID: String(user.id), productID, eventID, cartID, variantID, optionID, edition, offer,
    total: edition.price + shippingAmount };
}

export type NativeCart = Awaited<ReturnType<typeof seedNativeCart>>;
type Prepared = Readonly<{ transactionID: ReturnType<typeof randomUUID>; paymentID: string }>;
export type NativeAttempt = NativeCart & Prepared;
type PaymentAttempt = Parameters<typeof confirmation>[1] & Prepared & Readonly<{ total: number }>;

export async function prepare(payload: Payload, f: NativeCart, afterPrepare?: Parameters<typeof initiateThroughEndpoint>[3]): Promise<NativeAttempt> {
  const reply = await initiateThroughEndpoint(payload, f.user, { cartID: f.cartID, shippingAddress }, afterPrepare, true);
  assert.ok(reply && typeof reply === "object" && "outcome" in reply && reply.outcome === "prepared",
    "E2 must prepare the selected native SKU through the existing payment entry");
  assert.ok("transactionID" in reply && typeof reply.transactionID === "string" && "paymentID" in reply && typeof reply.paymentID === "string");
  return { ...f, ...reply as Prepared };
}

export async function settle(payload: Payload, f: PaymentAttempt, afterEffect?: NonNullable<Parameters<typeof confirmation>[2]>["afterEffect"]) {
  const input = { cartID: f.cartID, transactionID: f.transactionID, paymentID: f.paymentID };
  // The fixture only uses the identity tuple and request principal, never its v1 snapshot.
  const { req, deps, run } = await confirmation(payload, f, { expectedAmount: f.total, afterEffect });
  return runReconciliation(req, input, "confirm", async () => {
    await assertPaymentRiskReviewed(req, input, undefined, deps);
    return run();
  }, deps);
}

export async function settleOne(payload: Payload, f: PaymentAttempt) {
  await delay(1100); // Keep sequential pairs under the real provider-accounting limit.
  const response = await settle(payload, f);
  assert.equal(response.status, 200, "synthetic exact Paid must commit one native order");
}

export async function readResult(payload: Payload, f: NativeAttempt) {
  const url = new URL("http://127.0.0.1/api/payments/portone/result");
  url.search = new URLSearchParams({ transactionID: f.transactionID, paymentID: f.paymentID, cartID: f.cartID }).toString();
  const req = await createLocalReq({ user: f.user, req: { url: url.href, method: "GET" } }, payload);
  const response = await createResultEndpoint(async () => f.customerID).handler(req);
  return { status: response.status, body: await response.json() as { outcome?: string; orderID?: string; snapshot?: unknown } };
}

export function orders(control: Pool, id: string) {
  return control.query<{ id: string; amount: string; currency: string; snapshot: unknown }>(
    "SELECT id, amount::text, currency, commerce_snapshot AS snapshot FROM orders WHERE commerce_attempt_i_d = $1", [id],
  ).then(({ rows }) => rows);
}

export async function effects(control: Pool, id: string) {
  const { rows } = await control.query<{
    tickets: { id: string; event: string; buyer: string }[];
    grants: { id: string; buyer: string }[];
  }>(`SELECT
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'event', event_id, 'buyer', buyer_id) ORDER BY id)
      FROM commerce_admissions WHERE transaction_id = $1), '[]'::jsonb) AS tickets,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'buyer', beneficiary_user_id) ORDER BY id)
      FROM commerce_key_grant_intents WHERE payment_id = $1), '[]'::jsonb) AS grants`, [id]);
  return rows[0];
}

export function eventCapacity(control: Pool) {
  return control.query<{ id: string; reserved: string; committed: string }>(
    "SELECT id, reserved_quantity::text AS reserved, committed_quantity::text AS committed FROM commerce_events ORDER BY id",
  ).then(({ rows }) => rows);
}

export function eventWriteStamp(control: Pool) {
  return control.query("SELECT id, xmin::text AS write_stamp FROM commerce_events ORDER BY id").then(({ rows }) => rows);
}

// Deliberate storage corruption in the disposable proof only. Recompute the
// matching digest so this test cannot pass just by detecting a hash mismatch.
export async function corruptVersion(control: Pool, f: NativeAttempt, snapshot: unknown, version: number | undefined) {
  const { editionRuleVersion: _rule, ...remaining } = nativePurchaseSnapshotSchema.parse(snapshot);
  const changed = version === undefined ? remaining : { ...remaining, editionRuleVersion: version };
  const ordered = Object.fromEntries(Object.keys(nativePurchaseSnapshotSchema.parse(snapshot))
    .filter((key) => Object.hasOwn(changed, key)).map((key) => [key, Reflect.get(changed, key)]));
  const digest = createHash("sha256").update(JSON.stringify(ordered)).digest("hex");
  const client = await control.connect();
  try {
    await client.query("BEGIN");
    for (const sql of [
      "UPDATE transactions SET portone_snapshot = $1, portone_snapshot_hash = $2 WHERE id = $3",
      "UPDATE orders SET commerce_snapshot = $1 WHERE commerce_attempt_i_d = $3 AND length($2) = 64",
      "UPDATE commerce_reservations SET snapshot_hash = $2 WHERE attempt_i_d = $3 AND $1::jsonb IS NOT NULL",
    ]) assert.equal((await client.query(sql, [JSON.stringify(changed), digest, f.transactionID])).rowCount, 1);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
