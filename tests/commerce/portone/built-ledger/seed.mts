/*
 * Built-server ledger smoke, step 1 of 2: seed ONE quarantined pending attempt into a throwaway database.
 *
 * Why: the P0 of 25 Nov. Turbopack compiled ledger-transaction.ts's createRequire(resolve(...)) into
 * createRequire(<module id>), so inLedgerTransaction threw in the BUILT server only and every reconciliation
 * returned 409; tsx-run tests and DB proofs never saw it. This seed plus ./smoke.mjs drive the real webhook route of
 * `next start` output into the ledger. Not collected by tests/run-unit.mjs (no .test. in the name).
 *
 * Needs: a scratch Postgres migrated with `pnpm migrate`, never the shared dev DB; DATABASE_URI and PAYLOAD_SECRET
 * pointing at it; PORTONE_STORE_ID and PORTONE_CHANNEL_KEY equal to the server's. The script refuses any database
 * URI but a plain local one ending in "_proof", with no query or fragment (./proof-database.ts).
 *
 *   node --import tsx tests/commerce/portone/built-ledger/seed.mts seed     -> prints {"paymentID":...,"transactionID":...}
 *   node --import tsx tests/commerce/portone/built-ledger/seed.mts verify <transactionID> <webhookID from smoke.mjs>
 *        -> prints {"pass":true,"event":1,"paidReview":1}: exactly the event row and the paid-review row (exit 1 otherwise)
 *
 * Fixture preparation writes rows through payload.db.create (business hooks bypassed, as the DB proofs' fixtures do);
 * the reservation goes through reservePurchase. Nothing here calls a provider.
 */
import { createHash, randomUUID } from "node:crypto";
import type { Config, SanitizedConfig } from "payload";
import type { CommerceSnapshot } from "../../../../src/lib/commerce/contracts";
import { assertLocalProofDatabase } from "./proof-database";

const [mode, transactionArg, webhookArg] = process.argv.slice(2);
// Before Payload (or pg) sees the URI: only a disposable local *_proof database (./proof-database.ts).
assertLocalProofDatabase(process.env.DATABASE_URI);
const storeID = process.env.PORTONE_STORE_ID, channelKey = process.env.PORTONE_CHANNEL_KEY;
if (!storeID || !channelKey) throw new Error("PORTONE_STORE_ID and PORTONE_CHANNEL_KEY are required");

const [{ default: canonical }, { createLocalReq, getPayload }, { inPaymentTransaction }, { withCommerceWrite }, { reservePurchase },
  { commerceSnapshotHash }, { MEMBERSHIP_RELEASE }] = await Promise.all([
  import("../../../../src/payload.config"), import("payload"), import("../../../../src/lib/commerce/_shared/transaction"),
  import("../../../../src/lib/commerce/access"), import("../../../../src/lib/commerce/reservations"),
  import("../../../../src/lib/commerce/snapshot-hash"), import("../../../../src/lib/commerce/contracts"),
]);
const config = await canonical;
const logger = { options: { level: "silent" } } satisfies Config["logger"];
const payload = await getPayload({
  config: { ...config, typescript: { ...config.typescript, autoGenerate: false }, logger: logger as SanitizedConfig["logger"],
    admin: { ...config.admin, importMap: { ...config.admin.importMap, autoGenerate: false } } },
  disableOnInit: true,
});
try {
  if (mode === "verify") {
    if (!transactionArg || !webhookArg) throw new Error("verify needs the transaction ID and the webhook ID");
    // The two rows the quarantined Paid writes through the ledger, named exactly (accounting.ts eventKey and the paid review).
    const scopes = { event: `reconciliation-event:${transactionArg}:${createHash("sha256").update(webhookArg).digest("hex")}`,
      paidReview: `reconciliation-paid-review:${transactionArg}` };
    const found = Object.fromEntries(await Promise.all(Object.entries(scopes).map(async ([name, scope]) =>
      [name, (await payload.count({ collection: "commerce-reconciliations" as never, overrideAccess: true, where: { scope: { equals: scope } } })).totalDocs])));
    const pass = found.event === 1 && found.paidReview === 1;
    console.log(JSON.stringify({ pass, ...found }));
    if (!pass) process.exitCode = 1;
  } else if (mode === "seed") {
    const customerID = randomUUID(), eventID = randomUUID(), productID = randomUUID(), cartID = randomUUID(), transactionID = randomUUID();
    const now = new Date().toISOString();
    const snapshot: CommerceSnapshot = { version: 1, customerID, eventID, productID, releaseID: MEMBERSHIP_RELEASE, accountLimit: 1, cartID,
      quantity: 1, currency: "KRW", unitAmount: 10000, shippingAmount: 3000, totalAmount: 13000,
      orderName: "Built ledger smoke", productVersion: now, eventVersion: now,
      shippingAddress: { country: "KR", recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture only" } };
    const paymentID = transactionID.replaceAll("-", "");
    const rows = [
      { collection: "users", id: customerID, data: { email: `${customerID}@fixture.invalid`, name: "Fixture" } },
      { collection: "commerce-events", id: eventID, data: { name: "Fixture", publicationApproved: true, capacity: 10, transportCapacity: 10,
        reservedQuantity: 0, committedQuantity: 0, partIStartsAt: now, partIEndsAt: new Date(Date.now() + 3600000).toISOString(), claimCutoffAt: now } },
      { collection: "products", id: productID, data: { title: "Fixture", description: "Never offered", _status: "published", publicationApproved: true,
        event: eventID, inventory: 10, reservedQuantity: 0, priceInKRWEnabled: true, priceInKRW: 10000, shippingFeeKRW: 3000, dispatchSchedule: "Fixture",
        saleStartsAt: new Date(Date.now() - 60000).toISOString(), saleEndsAt: new Date(Date.now() + 3600000).toISOString() } },
      { collection: "carts", id: cartID, data: { customer: customerID, currency: "KRW", subtotal: 10000, items: [{ id: randomUUID(), product: productID, quantity: 1 }] } },
      // Held for review: a signed Paid event is recorded through the ledger, then answered "payment-quarantined" before any provider read.
      { collection: "transactions", id: transactionID, data: { customer: customerID, cart: cartID, currency: "KRW", amount: 13000, status: "pending",
        commerceReviewHold: true, paymentMethod: "portone", items: [{ id: randomUUID(), product: productID, quantity: 1 }],
        portone: { paymentID, prepareKey: commerceSnapshotHash(snapshot), snapshotHash: commerceSnapshotHash(snapshot), snapshot, storeID, channelKey } } },
    ];
    for (const row of rows) await payload.db.create({ collection: row.collection as never, customID: row.id, data: { ...row.data, createdAt: now, updatedAt: now } });
    const req = await createLocalReq({ user: { id: customerID, email: `${customerID}@fixture.invalid`, collection: "users" } as never }, payload);
    await inPaymentTransaction(req, () => withCommerceWrite(req, () => reservePurchase({ req, attemptID: transactionID,
      customerID, productID, releaseID: snapshot.releaseID, accountLimit: snapshot.accountLimit, eventID,
      quantity: snapshot.quantity, snapshotHash: commerceSnapshotHash(snapshot) })));
    console.log(JSON.stringify({ paymentID, transactionID }));
  } else throw new Error("usage: seed | verify <transactionID>");
} finally {
  await payload.destroy();
}
// Payload's pools and job timers keep the loop alive after destroy; the work is done (an error above already threw).
process.exit(process.exitCode ?? 0);
