import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { Socket } from "node:net";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { sql, type PostgresAdapter } from "@payloadcms/db-postgres";
import type { CollectionSlug, Endpoint, PayloadRequest, TypedUser } from "payload";
import type { PaymentAdapter } from "@payloadcms/plugin-ecommerce/types";
import { reservePurchase } from "../../../src/lib/commerce/reservations";
import { acceptUnitReturns, disposeReturnedUnits } from "../../../src/lib/commerce/returns";
import { grantOrderAdmissions, assignGuestName, checkInGuest, claimGuestAdmission, issueGuestClaim, redeemGuestBenefit } from "../../../src/lib/commerce/guests";
import { withCommerceWrite } from "../../../src/lib/commerce/access";
import { commerceSnapshotHash } from "../../../src/lib/commerce/snapshot-hash";
import type { CommerceSnapshot } from "../../../src/lib/commerce/contracts";
import { capturePayloadTestLifecycle } from "../../support/payload-lifecycle";
import { providerConfig, confirmation } from "../core/payment-postgres-fixture";
import { inPaymentEndpoint, paymentTransactionOutcome, relationshipID } from "../../../src/lib/commerce/_shared/transaction";
import { runReconciliation } from "../../../src/lib/commerce/portone/admission";
import { createAdapterEndpoints } from "../../../src/lib/commerce/portone/endpoints";
import { closeReconciliationPool } from "../../../src/lib/commerce/portone/ledger-transaction";
import { reconciliationEventScope } from "../../../src/lib/commerce/portone/accounting";
import { recordKeyGrantIntents } from "../../../src/lib/commerce/keys/intents";
import { retireFailedPayment } from "../../../src/lib/commerce/portone/review";

// This suite commits receipts and ledger entries. Its test-owned DB/volume is
// destroyed by the isolated Returns launcher; never load a checkout's dotenv.
test("real Payload commerce inventory, CMS concurrency and held return acceptance", {
  skip: process.env.COMMERCE_PAYLOAD_DATABASE_TESTS !== "1", timeout: 90_000,
}, async (t) => {
  process.env.DISABLE_PAYLOAD_HMR = "true";
  const database = new URL(process.env.DATABASE_URI ?? "");
  assert.equal(database.protocol, "postgresql:");
  assert.equal(database.hostname, "127.0.0.1");
  assert.equal(database.pathname, "/returns_proof");
  assert.ok(database.port && database.port === process.env.PROOF_DB_PORT);
  assert.equal(database.search + database.hash, "");
  for (const key of ["MEMBER_WALLET_OWNER_ADDRESS", "MEMBER_WALLET_CHAIN_ID"]) {
    assert.equal(process.env[key] === undefined, true, "Wallet configuration is not admitted");
  }
  assert.equal(process.env.PORTONE_PAYMENT_MODE, "disabled");
  assert.equal(process.env.MEMBER_AUTH_MAIL_MODE, "disabled");
  const origin = "http://localhost:3000";
  const memberProfile = {
    MEMBER_AUTH_MODE: "local", MEMBER_AUTH_ORIGIN: origin,
    BETTER_AUTH_URL: origin, NEXT_PUBLIC_SERVER_URL: origin,
    BETTER_AUTH_SECRET: "returns-fixture-auth-secret-not-for-use",
    PHONE_VERIFICATION_MODE: "local", PHONE_VERIFICATION_ORIGIN: origin,
    PHONE_VERIFICATION_DATABASE_URL: database.href, PHONE_VERIFICATION_TRANSPORT: "fixture",
    PHONE_VERIFICATION_STATE_SECRET: "a".repeat(64),
    PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET: "returns-fixture-webhook-secret-not-for-use",
    PHONE_VERIFICATION_RECIPIENT: "returns@fixture.invalid",
    PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: "1", PHONE_VERIFICATION_ZOHO_USER_ID: "2",
    PHONE_VERIFICATION_ZOHO_INTEGRATION_ID: "3",
  };
  const previous = Object.fromEntries(Object.keys(memberProfile).map(key => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  Object.assign(process.env, memberProfile);
  let blockedOutbound = 0;
  t.mock.method(globalThis, "fetch", async () => { blockedOutbound++; throw new Error("Commerce acceptance forbids outbound HTTP"); });
  const originalConnect = Socket.prototype.connect;
  t.mock.method(Socket.prototype, "connect", function (this: Socket, ...args: Parameters<Socket["connect"]>) {
    const first: unknown = Array.isArray(args[0]) ? args[0][0] : args[0];
    const options = typeof first === "object" && first !== null ? first as Record<string, unknown> : null;
    const port = Number(options ? options.port : first);
    const host = options ? String(options.host ?? "localhost") : typeof args[1] === "string" ? args[1] : "localhost";
    if (options?.path || port !== Number(database.port || 5432) || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
      blockedOutbound++;
      throw new Error("Commerce acceptance permits only selected local database transport");
    }
    return Reflect.apply(originalConnect, this, args);
  });
  const [{ getPayload }, { createLocalReq }] = await Promise.all([import("../../../src/payload"), import("payload")]);
  const payload = await getPayload();
  const close = capturePayloadTestLifecycle(payload);
  let closeMemberPool: (() => Promise<void>) | undefined;
  t.after(async () => {
    try {
      try { await closeMemberPool?.(); }
      finally { await closeReconciliationPool(payload); }
    } finally { await close(); }
    assert.equal(blockedOutbound, 0, "No provider transport may be attempted");
  });
  const selectedDatabase = await (payload.db as unknown as PostgresAdapter).drizzle.execute(sql`
    SELECT current_database() AS name,
      NOT EXISTS (SELECT 1 FROM transactions) AND NOT EXISTS (SELECT 1 FROM orders)
      AND NOT EXISTS (SELECT 1 FROM users) AND NOT EXISTS (SELECT 1 FROM commerce_reconciliations)
      AND NOT EXISTS (SELECT 1 FROM commerce_admissions) AS fresh
  `);
  assert.equal(selectedDatabase.rows[0].name, "returns_proof");
  assert.equal(selectedDatabase.rows[0].fresh, true, "Receipts require a fresh migrated disposable DB");

  const request = async (user?: TypedUser) => createLocalReq({ user }, payload);
  const begin = async (req: PayloadRequest) => {
    const id = await payload.db.beginTransaction();
    if (!id) throw new Error("PostgreSQL transactions required");
    req.transactionID = id;
    return id;
  };
  const canonical = async (collection: string, id: string, req?: PayloadRequest) => {
    const row = await (req?.payload ?? payload).db.findOne({ collection: collection as CollectionSlug, where: { id: { equals: id } }, draftsEnabled: false, req });
    assert.ok(row);
    return row as Record<string, unknown> & { id: string };
  };

  async function fixture(quantity: number, productPrice = 10000) {
    const customerID = randomUUID(), adminID = randomUUID(), eventID = randomUUID(), productID = randomUUID(), cartID = randomUUID(), transactionID = randomUUID();
    const now = new Date().toISOString();
    const snapshot: CommerceSnapshot = {
      version: 1, customerID, eventID, productID, releaseID: "membership" as const, accountLimit: Math.max(1, quantity), cartID, quantity, currency: "KRW", unitAmount: productPrice, shippingAmount: 3000, totalAmount: quantity * productPrice + 3000,
      orderName: "Owned commerce acceptance fixture", productVersion: now, eventVersion: now,
      shippingAddress: { country: "KR", recipientName: "Fixture recipient", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture address, not for delivery" },
    };
    const rows = [
      { collection: "users", id: customerID, data: { email: `commerce-${customerID}@fixture.invalid`, name: "Commerce fixture", emailVerified: true, membershipStatus: "applicant" } },
      { collection: "admins", id: adminID, data: { email: `commerce-${adminID}@fixture.invalid`, name: "Commerce fixture operator", role: "admin" } },
      { collection: "commerce-events", id: eventID, data: { name: "Owned event fixture", publicationApproved: true, capacity: 10, transportCapacity: 10, reservedQuantity: 0, committedQuantity: 0, partIStartsAt: new Date(Date.now() - 60000).toISOString(), partIEndsAt: new Date(Date.now() + 3600000).toISOString(), claimCutoffAt: new Date(Date.now() + 1800000).toISOString() } },
      { collection: "products", id: productID, data: { title: "Published fixture", description: "Owned fixture, never offered", _status: "published", publicationApproved: true, event: eventID, inventory: 10, reservedQuantity: 0, priceInKRWEnabled: true, priceInKRW: productPrice, shippingFeeKRW: 3000, dispatchSchedule: "Fixture only", saleStartsAt: new Date(Date.now() - 60000).toISOString(), saleEndsAt: new Date(Date.now() + 3600000).toISOString() } },
      { collection: "carts", id: cartID, data: { customer: customerID, currency: "KRW", subtotal: quantity * productPrice, items: [{ id: randomUUID(), product: productID, quantity }] } },
      { collection: "transactions", id: transactionID, data: { customer: customerID, cart: cartID, currency: "KRW", amount: snapshot.totalAmount, status: "pending", paymentMethod: "portone", items: [{ id: randomUUID(), product: productID, quantity }], portone: { paymentID: transactionID.replaceAll("-", ""), prepareKey: commerceSnapshotHash(snapshot), snapshotHash: commerceSnapshotHash(snapshot), snapshot, storeID: "fixture-store", channelKey: "fixture-channel" } } },
    ];
    const req = await request();
    const tx = await begin(req);
    try {
      for (const row of rows) await payload.db.create({ collection: row.collection as CollectionSlug, customID: row.id, data: { ...row.data, createdAt: now, updatedAt: now }, req });
      await payload.db.commitTransaction(tx);
    } catch (error) { await payload.db.rollbackTransaction(tx); throw error; }
    const user = { ...await canonical("users", customerID), collection: "users" } as TypedUser;
    const admin = { ...await canonical("admins", adminID), collection: "admins", _strategy: "staff-better-auth" } as unknown as TypedUser;
    return { snapshot, customerID, adminID, eventID, productID, cartID, transactionID, user, admin };
  }

  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const input = (f: Fixture) => ({
    cartID: f.cartID, transactionID: f.transactionID, paymentID: f.transactionID.replaceAll("-", ""),
  });
  const reserve = (f: Fixture, req: PayloadRequest) => reservePurchase({
    req, attemptID: f.transactionID, customerID: f.customerID, productID: f.productID,
    releaseID: "membership" as const, accountLimit: f.snapshot.accountLimit, eventID: f.eventID, quantity: f.snapshot.quantity, snapshotHash: commerceSnapshotHash(f.snapshot),
  });
  const commitReservation = async (f: Fixture) => {
    const req = await request(f.user);
    const tx = await begin(req);
    try {
      const row = await reserve(f, req);
      await payload.db.commitTransaction(tx);
      return row.id;
    } catch (error) { await payload.db.rollbackTransaction(tx); throw error; }
  };
  const related = (collection: CollectionSlug, field: string, id: string, req?: PayloadRequest) =>
    (req?.payload ?? payload).find({ collection, where: { [field]: { equals: id } }, depth: 0, overrideAccess: true, req });
  const receipt = async (response: Response) => {
    assert.equal(response.status, 200);
    const { orderID } = await response.json() as { orderID?: string };
    assert.ok(orderID, "Successful confirmation must return a canonical order");
    return orderID;
  };
  const assertSettledOnce = async (f: Fixture, orderID: string) => {
    assert.equal((await canonical("products", f.productID)).inventory, 9);
    assert.equal((await canonical("products", f.productID)).reservedQuantity, 0);
    assert.equal((await canonical("commerce-events", f.eventID)).reservedQuantity, 0);
    assert.equal((await canonical("commerce-events", f.eventID)).committedQuantity, 1);
    const transaction = await canonical("transactions", f.transactionID);
    assert.equal(transaction.status, "succeeded");
    assert.equal(relationshipID(transaction.order), orderID);
    assert.equal(typeof (await canonical("carts", f.cartID)).purchasedAt, "string");
    assert.equal((await canonical("users", f.customerID)).membershipStatus, "approved");
    const allowances = await related("commerce-allowances", "customer", f.customerID);
    assert.equal(allowances.totalDocs, 1);
    const allowance = await canonical("commerce-allowances", String(allowances.docs[0].id));
    assert.equal(allowance.paidQuantity, 1);
    assert.equal(allowance.reservedQuantity, 0);
    for (const [collection, field, id] of [
      ["orders", "transactions", f.transactionID], ["commerce-admissions", "order", orderID],
      ["commerce-key-grant-intents", "order", orderID], ["commerce-reservations", "attemptID", f.transactionID],
    ] as const) assert.equal((await related(collection, field, id)).totalDocs, 1, collection);
  };

  const packageEntry = createRequire(import.meta.url).resolve("@payloadcms/plugin-ecommerce");
  const { confirmOrderHandler } = await import(new URL("./endpoints/confirmOrder.js", pathToFileURL(packageEntry)).href) as {
    confirmOrderHandler: (args: Record<string, unknown>) => Endpoint["handler"];
  };
  const currenciesConfig = { defaultCurrency: "KRW", supportedCurrencies: [{ code: "KRW", decimals: 0, label: "KRW", symbol: "KRW" }] };

  await t.test("interrupted official finalization rolls back and retries without double stock or admissions", async () => {
    const f = await fixture(1);
    const req = await request(f.user);
    req.payloadAPI = "REST";
    req.data = input(f);
    let injectionReached = false;
    let rolledBackOrderID: string | undefined;
    const method: PaymentAdapter = {
      name: "fixture", label: "Injected provider-free fixture",
      group: { name: "fixture", type: "group", fields: [] },
      initiatePayment: async () => { throw new Error("No provider initiation in DB acceptance"); },
      confirmOrder: async ({ req: owned, finalizeOrder }) => {
        assert.equal(owned === req, true, "The installed finalizer must keep the owned request");
        if (!finalizeOrder) throw new Error("Installed finalizer unavailable");
        await reserve(f, owned);
        const order = await withCommerceWrite(owned, () => finalizeOrder({
          transactionID: f.transactionID, orderData: { amount: f.snapshot.totalAmount, currency: "KRW",
            customer: f.customerID, items: [{ product: f.productID, quantity: 1 }], status: "processing",
            commerceVersion: "commerce-v1", commerceAttemptID: f.transactionID, commerceSnapshot: f.snapshot },
        }));
        rolledBackOrderID = String(order.id);
        assert.equal((await canonical("products", f.productID, owned)).inventory, 9);
        assert.equal((await related("commerce-admissions", "order", rolledBackOrderID, owned)).totalDocs, 1);
        assert.equal((await related("commerce-key-grant-intents", "order", rolledBackOrderID, owned)).totalDocs, 1);
        // Reject after real effects, outside a Local API hook's inner killTransaction path.
        injectionReached = true;
        throw new Error("Synthetic interruption after official finalization");
      },
    };
    const response = await inPaymentEndpoint(req, confirmOrderHandler({ paymentMethod: method, currenciesConfig }));
    assert.equal(response.status, 500);
    assert.equal(injectionReached, true, "Failure must occur after actual stock, admission and intent writes");
    assert.equal(paymentTransactionOutcome(req), "rolled-back");
    assert.equal((await canonical("products", f.productID)).inventory, 10);
    assert.equal((await canonical("products", f.productID)).reservedQuantity, 0);
    assert.equal((await canonical("commerce-events", f.eventID)).reservedQuantity, 0);
    assert.equal((await canonical("commerce-events", f.eventID)).committedQuantity, 0);
    assert.equal((await canonical("carts", f.cartID)).purchasedAt == null, true);
    assert.equal((await canonical("users", f.customerID)).membershipStatus, "applicant");
    const pending = await canonical("transactions", f.transactionID);
    assert.equal(pending.status, "pending");
    assert.equal(pending.order == null, true);
    assert.ok(rolledBackOrderID);
    for (const [collection, field, id] of [
      ["orders", "transactions", f.transactionID], ["commerce-admissions", "transaction", f.transactionID],
      ["commerce-key-grant-intents", "order", rolledBackOrderID], ["commerce-reservations", "attemptID", f.transactionID],
      ["commerce-allowances", "customer", f.customerID],
    ] as const) assert.equal((await related(collection, field, id)).totalDocs, 0, collection);

    await commitReservation(f);
    const attempt = await confirmation(payload, f);
    const orderID = await receipt(await attempt.runAdmitted());
    assert.equal(attempt.reads(), 2);
    await assertSettledOnce(f, orderID);
    const replay = await confirmation(payload, f);
    assert.equal(await receipt(await replay.runAdmitted()), orderID);
    assert.equal(replay.reads(), 0);
    await assertSettledOnce(f, orderID);
  });

  await t.test("actual PortOne adapter validates injected PAID proof and finalizes stock exactly once", async () => {
    await delay(1100); // Clear the shared real one-second GET window.
    const f = await fixture(1);
    const reservationID = await commitReservation(f);
    assert.equal((await canonical("commerce-reservations", reservationID)).state, "reserved");
    assert.equal((await canonical("products", f.productID)).inventory, 10);
    const first = await confirmation(payload, f, { beforeEvidence: async (owned) => {
      assert.equal(owned.user?.id, f.customerID);
      assert.equal(owned.data?.paymentID, input(f).paymentID);
    } });
    const orderID = await receipt(await first.runAdmitted());
    assert.equal(first.reads(), 2);
    assert.equal((await canonical("commerce-reservations", reservationID)).state, "settled");
    await assertSettledOnce(f, orderID);
    const replay = await confirmation(payload, f);
    assert.equal(await receipt(await replay.runAdmitted()), orderID);
    assert.equal(replay.reads(), 0);
    await assertSettledOnce(f, orderID);
  });

  await t.test("verified retirement permits replacement but late PAID durably quarantines the original without reallocating", async () => {
    await delay(1100);
    const f = await fixture(1);
    const originalReservation = await commitReservation(f);
    const original = input(f);
    let status: "FAILED" | "PAID" = "FAILED";
    const reads: string[] = [];
    const deps = { config: providerConfig, getPayment: async ({ paymentId, storeId }: { paymentId: string; storeId: string }) => {
      assert.equal(paymentId, original.paymentID);
      assert.equal(storeId, providerConfig.storeId);
      reads.push(status);
      return { id: paymentId, status, storeId, channel: { key: providerConfig.channelKey, type: "TEST" },
        customer: { id: f.customerID }, currency: "KRW",
        amount: { total: f.snapshot.totalAmount, paid: status === "PAID" ? f.snapshot.totalAmount : 0, cancelled: 0 }, disputes: [] };
    } };
    const owner = await request(f.user);
    const retired = await runReconciliation(owner, original, "retire", async () => {
      await retireFailedPayment(owner, original, deps);
      return Response.json({ retired: true });
    }, deps);
    assert.equal(retired.status, 200);
    assert.deepEqual(reads, ["FAILED"]);
    assert.equal((await canonical("transactions", f.transactionID)).status, "failed");
    assert.equal((await canonical("commerce-reservations", originalReservation)).state, "released");
    assert.equal((await canonical("products", f.productID)).reservedQuantity, 0);
    assert.equal((await canonical("commerce-events", f.eventID)).reservedQuantity, 0);

    const replacement = { ...f, cartID: randomUUID(), transactionID: randomUUID() };
    const snapshot = { ...f.snapshot, cartID: replacement.cartID };
    const hash = commerceSnapshotHash(snapshot);
    const now = new Date().toISOString();
    const replacementReq = await request(f.user);
    const replacementTx = await begin(replacementReq);
    let replacementReservation: string;
    try {
      const items = [{ id: randomUUID(), product: f.productID, quantity: 1 }];
      await payload.db.create({ collection: "carts", customID: replacement.cartID, data: {
        customer: f.customerID, currency: "KRW", subtotal: snapshot.unitAmount, items, createdAt: now, updatedAt: now,
      }, req: replacementReq });
      await payload.db.create({ collection: "transactions", customID: replacement.transactionID, data: {
        customer: f.customerID, cart: replacement.cartID, currency: "KRW", amount: snapshot.totalAmount,
        status: "pending", paymentMethod: "portone", items,
        portone: { paymentID: input(replacement).paymentID, prepareKey: hash, snapshotHash: hash, snapshot,
          storeID: providerConfig.storeId, channelKey: providerConfig.channelKey }, createdAt: now, updatedAt: now,
      }, req: replacementReq });
      replacementReservation = (await reserve({ ...replacement, snapshot }, replacementReq)).id;
      await payload.db.commitTransaction(replacementTx);
    } catch (error) { await payload.db.rollbackTransaction(replacementTx); throw error; }
    status = "PAID";
    const event = { type: "Transaction.Paid", data: { paymentId: original.paymentID, storeId: providerConfig.storeId } };
    const webhookID = `returns-fixture-${randomUUID()}`;
    let verified = false;
    const endpoint = createAdapterEndpoints({ ...deps, verifyWebhook: async () => { verified = true; return event; } })
      .find(entry => entry.path === "/webhooks");
    assert.ok(endpoint);
    const webhook = Object.assign(new Request(providerConfig.origin + "/api/payments/portone/webhooks", {
      method: "POST", body: JSON.stringify(event), headers: {
        "content-type": "application/json", "webhook-id": webhookID,
        "webhook-timestamp": "1", "webhook-signature": "synthetic-fixture-signature",
      },
    }), { payload, user: null, context: {} }) as unknown as PayloadRequest;
    const result = await endpoint.handler(webhook);
    assert.equal(verified, true);
    assert.equal(result.status, 200);
    assert.equal((await result.json() as { outcome?: string }).outcome, "late-paid-quarantined");
    assert.deepEqual(reads, ["FAILED", "PAID"]);
    const records = await related("commerce-reconciliations", "scope", reconciliationEventScope(f.transactionID, webhookID));
    assert.equal(records.totalDocs, 1, "Verified late Paid must have a durable event receipt");
    const record = await canonical("commerce-reconciliations", String(records.docs[0].id));
    const state = record.state as { event: { id: string; type: string }; identity: { transactionID: string } };
    assert.deepEqual(state.event, { id: webhookID, type: "Transaction.Paid" });
    assert.equal(state.identity.transactionID, f.transactionID);
    const originalRow = await canonical("transactions", f.transactionID);
    assert.equal(originalRow.status, "failed");
    assert.equal(originalRow.commerceReviewHold, true);
    assert.equal(originalRow.commerceResolutionConflict, true);
    assert.equal(originalRow.order == null, true);
    assert.equal((await related("orders", "transactions", f.transactionID)).totalDocs, 0);
    assert.equal((await canonical("commerce-reservations", originalReservation)).state, "released");
    assert.equal((await canonical("commerce-reservations", replacementReservation)).state, "reserved");
    assert.equal((await canonical("transactions", replacement.transactionID)).status, "pending");
    assert.equal((await canonical("products", f.productID)).reservedQuantity, 1);
    assert.equal((await canonical("products", f.productID)).inventory, 10);
    assert.equal((await canonical("commerce-events", f.eventID)).reservedQuantity, 1);
  });

  await t.test("real plugin finalization decrements main stock without publishing or replaying a CMS draft", async () => {
    await delay(1100);
    const f = await fixture(1);
    await payload.update({ collection: "products", id: f.productID, data: { title: "Unpublished fixture draft" },
      draft: true, overrideAccess: true, req: await request(f.admin) });
    assert.equal((await canonical("products", f.productID)).title, "Published fixture");
    const before = await payload.findVersions({ collection: "products", where: { parent: { equals: f.productID } }, limit: 10, overrideAccess: true });
    assert.equal(before.docs.some(({ version }) => version.title === "Unpublished fixture draft"), true);
    await commitReservation(f);
    const first = await confirmation(payload, f);
    const orderID = await receipt(await first.runAdmitted());
    assert.equal(first.reads(), 2);
    const replay = await confirmation(payload, f);
    assert.equal(await receipt(await replay.runAdmitted()), orderID);
    assert.equal(replay.reads(), 0);
    await assertSettledOnce(f, orderID);
    const product = await canonical("products", f.productID);
    assert.equal(product.title, "Published fixture");
    assert.equal(product._status, "published");
    const versions = await payload.findVersions({ collection: "products", where: { parent: { equals: f.productID } }, limit: 10, overrideAccess: true });
    assert.equal(versions.docs.some(({ version }) => version.title === "Unpublished fixture draft"), true);
  });

  await t.test("normal customer cart creation and editing preserve plugin calculations", async (cartTest) => {
    const f = await fixture(1);
    const other = await fixture(1, 14000);
    const req = await request(f.user);
    const tx = await begin(req);
    try {
      const { getPayloadMemberRuntime } = await import("../../../src/lib/member-auth/payload-runtime");
      const runtime = getPayloadMemberRuntime();
      assert.ok(runtime, "Local canonical membership runtime must be configured");
      closeMemberPool = () => runtime.pool.end();
      assert.equal(runtime.config.databaseUrl, database.href);
      assert.equal(runtime.config.origin, origin);
      const sessionID = randomUUID();
      cartTest.mock.method(runtime, "toMemberPrincipal", async () => ({ userId: f.customerID, sessionId: sessionID, emailVerified: true, email: `commerce-${f.customerID}@fixture.invalid`, sessionCreatedAt: new Date() }));
      cartTest.mock.method(runtime.repository, "isActiveMember", async (customerID: string) => customerID === f.customerID);
      Object.defineProperties(req, {
        url: { value: new URL("/api/carts", runtime.config.origin).href, configurable: true },
        method: { value: "POST", configurable: true },
      });
      req.headers = new Headers({ origin: runtime.config.origin, host: new URL(runtime.config.origin).host, "sec-fetch-site": "same-origin" });
      const policy = { effectiveDate: "2020-01-01", sections: [{ heading: "Synthetic acceptance policy", paragraphs: ["Fixture only, never approved for publication."] }] };
      const publication = { _status: "published", publicationApproved: true, physicalProductApproved: true, fulfillmentReady: true, addressRetentionApproved: true, shippingCountries: ["KR"], disclosure: { seller: { name: "Synthetic seller", registrationNumber: "123-45-67890", representative: "Fixture", address: "Fixture address", phone: "02-1234-5678" }, policies: { terms: policy, privacy: policy, refund: policy } } };
      const findGlobal = payload.findGlobal.bind(payload);
      cartTest.mock.method(payload, "findGlobal", async (args: Parameters<typeof payload.findGlobal>[0]) => args.slug === "commerce-publication" ? structuredClone(publication) as unknown as Awaited<ReturnType<typeof payload.findGlobal>> : findGlobal(args));
      const mediaID = randomUUID();
      await payload.db.create({ collection: "media", customID: mediaID, data: { filename: `fixture-${mediaID}.png`, mimeType: "image/png", filesize: 0, width: 1, height: 1, alt: "Synthetic acceptance metadata only", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, req });
      for (const id of [f.productID, other.productID]) {
        await payload.db.updateOne({ collection: "products", id, data: { images: [{ id: randomUUID(), image: mediaID }] }, req });
      }
      const cart = await payload.create({ collection: "carts", data: { customer: f.customerID, currency: "KRW", items: [{ product: f.productID, quantity: 1 }] }, overrideAccess: false, req });
      assert.equal(cart.subtotal, 10000);
      const edited = await payload.update({ collection: "carts", id: cart.id, data: { items: [{ product: other.productID, quantity: 1 }] }, overrideAccess: false, req });
      assert.equal(edited.subtotal, 14000);
      const stored = await canonical("carts", String(cart.id), req);
      assert.equal(stored.subtotal, 14000);
      assert.equal(relationshipID((stored.items as { product: unknown }[])[0]?.product), other.productID);
      assert.equal((await canonical("products", other.productID, req)).reservedQuantity, 0);
      assert.equal((await canonical("products", f.productID, req)).inventory, 10);
      assert.equal((await canonical("products", f.productID, req)).reservedQuantity, 0);
    } finally { cartTest.mock.restoreAll(); await payload.db.rollbackTransaction(tx); }
  });

  await t.test("concurrent CMS event save cannot erase a reservation committed while waiting for its lock", async () => {
    const f = await fixture(1);
    const reserveReq = await request(f.user), cmsReq = await request(f.admin);
    const reserveTx = await begin(reserveReq), cmsTx = await begin(cmsReq);
    let reserveCommitted = false;
    let save: Promise<unknown> | undefined;
    try {
      await reserve(f, reserveReq);
      const adapter = payload.db as unknown as PostgresAdapter;
      const db = adapter.sessions[String(cmsTx)].db;
      const backend = await db.execute(sql`SELECT pg_backend_pid() AS pid`);
      const pid = Number(backend.rows[0].pid);
      save = payload.update({ collection: "commerce-events" as CollectionSlug, id: f.eventID, data: { name: "Owned fixture edited concurrently" }, overrideAccess: true, req: cmsReq });
      let observedWait = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const locks = await adapter.drizzle.execute(sql`SELECT 1 FROM pg_locks WHERE pid = ${pid} AND locktype = 'advisory' AND NOT granted`);
        if (locks.rows.length) { observedWait = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert.equal(observedWait, true, "CMS save must reach its actual PostgreSQL lock wait");
      await payload.db.commitTransaction(reserveTx);
      reserveCommitted = true;
      await save;
      assert.equal((await canonical("commerce-events", f.eventID, cmsReq)).reservedQuantity, 1);
    } finally {
      if (!reserveCommitted) await payload.db.rollbackTransaction(reserveTx);
      if (save) await save.catch(() => undefined);
      await payload.db.rollbackTransaction(cmsTx);
    }
  });

  // Only setup writes historical accounting directly. No new multi-unit
  // checkout is admitted; the real admission grant and return/claim code run.
  async function seedHistoricalSettlement(f: Fixture, req: PayloadRequest) {
    const orderID = randomUUID();
    const now = new Date().toISOString();
    const { customerID, eventID, productID, cartID, transactionID, snapshot } = f;
    const quantity = snapshot.quantity;
    const items = [{ id: randomUUID(), product: productID, quantity }];
    await payload.db.create({ collection: "orders", customID: orderID, data: {
      amount: snapshot.totalAmount, currency: "KRW", customer: customerID, items,
      transactions: [transactionID], status: "processing", commerceVersion: "commerce-v1",
      commerceAttemptID: transactionID, commerceSnapshot: snapshot, createdAt: now, updatedAt: now,
    }, req });
    const updated = [
      await payload.db.updateOne({ collection: "transactions", id: transactionID, data: { status: "succeeded", order: orderID }, req }),
      await payload.db.updateOne({ collection: "carts", id: cartID, data: { purchasedAt: now }, req }),
      await payload.db.updateOne({ collection: "products", id: productID, data: { inventory: 10 - quantity }, req }),
      await payload.db.updateOne({ collection: "commerce-events", id: eventID, data: { committedQuantity: quantity }, req }),
    ];
    assert.equal(updated.every(Boolean), true, "Historical settlement preimages must exist");
    const snapshotHash = commerceSnapshotHash(snapshot);
    const accountReleaseKey = createHash("sha256").update(JSON.stringify([customerID, productID])).digest("hex");
    await payload.db.create({ collection: "commerce-allowances", customID: randomUUID(), data: {
      accountReleaseKey, customer: customerID, releaseID: "membership", reservedQuantity: 0, paidQuantity: quantity,
      createdAt: now, updatedAt: now,
    }, req });
    await payload.db.create({ collection: "commerce-reservations", customID: randomUUID(), data: {
      attemptID: transactionID, customer: customerID, product: productID, event: eventID, releaseID: "membership",
      quantity, snapshotHash, state: "settled", order: orderID, returnedUnits: [], createdAt: now, updatedAt: now,
    }, req });
    const admissions = await withCommerceWrite(req, async () => {
      const granted = await grantOrderAdmissions({ req, orderID, transactionID });
      const intents = await recordKeyGrantIntents({ req, orderID, transactionID, beneficiaryID: customerID, admissions: granted });
      assert.equal(intents.length, quantity);
      return granted;
    });
    assert.deepEqual(admissions.map(row => row.unit), Array.from({ length: quantity }, (_, i) => i + 1));
    return orderID;
  }

  await t.test("held partial returns restore only accepted allowance and retain the financial hold", async () => {
    const f = await fixture(3);
    const req = await request(f.user);
    const tx = await begin(req);
    try {
      const orderID = await seedHistoricalSettlement(f, req);
      await withCommerceWrite(req, () => payload.update({ collection: "transactions", id: f.transactionID,
        data: { commerceReviewHold: true }, overrideAccess: true, req }));
      const allowance = async () => {
        const rows = await related("commerce-allowances", "customer", f.customerID, req);
        assert.equal(rows.totalDocs, 1);
        return rows.docs[0] as unknown as { paidQuantity: number };
      };
      const admissions = await related("commerce-admissions", "order", orderID, req);
      assert.equal(admissions.totalDocs, 3);
      const byUnit = new Map(admissions.docs.map(doc => [Number((doc as unknown as { unit: number }).unit), String(doc.id)]));
      const retainedID = byUnit.get(1), returnedID = byUnit.get(2), thirdID = byUnit.get(3);
      assert.ok(retainedID && returnedID && thirdID);
      assert.equal(new Set([retainedID, returnedID, thirdID]).size, 3);
      assert.equal((await allowance()).paidQuantity, 3);
      assert.equal((await canonical("products", f.productID, req)).inventory, 7);
      assert.equal((await canonical("commerce-events", f.eventID, req)).committedQuantity, 3);
      assert.equal((await canonical("commerce-admissions", returnedID, req)).status, "available");
      assert.equal((await canonical("transactions", f.transactionID, req)).commerceReviewHold, true);

      req.user = f.admin;
      const evidenceID = `fixture-return-${randomUUID()}`;
      assert.deepEqual(await acceptUnitReturns({ req, orderID, units: [2], evidenceID }), { newlyAcceptedUnits: [2] });
      assert.deepEqual(await acceptUnitReturns({ req, orderID, units: [2], evidenceID: "replayed-fixture-evidence" }), { newlyAcceptedUnits: [] });
      const returned = await canonical("commerce-admissions", returnedID, req);
      assert.equal(returned.status, "revoked");
      assert.equal(returned.returnEvidence, evidenceID);
      assert.equal(returned.stockDisposition, "pending-inspection");
      for (const id of [retainedID, thirdID]) {
        const retained = await canonical("commerce-admissions", id, req);
        assert.equal(retained.status, "available");
        assert.equal(retained.returnAcceptedAt == null, true);
      }
      assert.equal((await allowance()).paidQuantity, 2);
      assert.equal((await canonical("commerce-events", f.eventID, req)).committedQuantity, 2);
      assert.equal((await canonical("products", f.productID, req)).inventory, 7);
      const reservations = await related("commerce-reservations", "attemptID", f.transactionID, req);
      assert.equal(reservations.totalDocs, 1);
      const reservation = await canonical("commerce-reservations", String(reservations.docs[0].id), req);
      assert.equal(reservation.state, "settled");
      assert.deepEqual(reservation.returnedUnits, [2]);
      await assert.rejects(redeemGuestBenefit({ req, admissionID: retainedID, kind: "part-i-drink", actionID: "fixture-held-action-1" }), /held.*review/i);
      assert.deepEqual(await disposeReturnedUnits({ req, orderID, units: [2], disposition: "restock" }), { disposedUnits: [2] });
      assert.deepEqual(await disposeReturnedUnits({ req, orderID, units: [2], disposition: "restock" }), { disposedUnits: [] });
      assert.equal((await canonical("products", f.productID, req)).inventory, 8);
      assert.equal((await canonical("commerce-admissions", returnedID, req)).stockDisposition, "restock");
      assert.equal((await allowance()).paidQuantity, 2);
      assert.equal((await canonical("transactions", f.transactionID, req)).commerceReviewHold, true);
    } finally { await payload.db.rollbackTransaction(tx); }
  });

  await t.test("named admission, rotated single-use claim and idempotent redemption use real Payload records", async () => {
    // Source compatibility only: unit 1 is reserved self; use pending gift unit 2.
    // This gated legacy characterization approves neither self activation nor name-only entry.
    const f = await fixture(2);
    const req = await request(f.user);
    const tx = await begin(req);
    try {
      const orderID = await seedHistoricalSettlement(f, req);
      const admissions = await payload.find({ collection: "commerce-admissions" as CollectionSlug, where: { and: [{ order: { equals: orderID } }, { unit: { equals: 2 } }] }, depth: 0, overrideAccess: true, req });
      assert.equal(admissions.docs.length, 1, "Exactly the pending gift unit is selected");
      const admissionID = String(admissions.docs[0].id);
      await assignGuestName({ req, admissionID, guestName: "Named fixture guest" });
      req.user = f.admin;
      await checkInGuest({ req, admissionID });
      const checkedIn = await canonical("commerce-admissions", admissionID, req);
      assert.equal(checkedIn.status, "checked-in");
      assert.equal(checkedIn.claimedAccount == null, true, "Name-only entry does not require registration");
      await assert.rejects(redeemGuestBenefit({ req, admissionID, kind: "part-i-drink", actionID: "unregistered-guest-action" }), /checked-in admission/);
      req.user = f.user;
      const oldClaim = await issueGuestClaim({ req, admissionID });
      const freshClaim = await issueGuestClaim({ req, admissionID });
      assert.notEqual(freshClaim.token, oldClaim.token);
      const guestID = randomUUID(), secondGuestID = randomUUID();
      for (const id of [guestID, secondGuestID]) {
        await payload.db.create({ collection: "users", customID: id, data: {
          email: `guest-${id}@fixture.invalid`, name: "Verified fixture guest", emailVerified: true,
          membershipStatus: "approved", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }, req });
      }
      req.user = { id: guestID, collection: "users" } as TypedUser;
      const activeMember = async (customerID: string) => customerID === guestID || customerID === secondGuestID;
      await assert.rejects(claimGuestAdmission({ req, token: oldClaim.token }, activeMember), /Invalid/);
      assert.deepEqual(await claimGuestAdmission({ req, token: freshClaim.token }, activeMember), { admissionID });
      assert.deepEqual(await claimGuestAdmission({ req, token: freshClaim.token }, activeMember), { admissionID });
      req.user = { id: secondGuestID, collection: "users" } as TypedUser;
      await assert.rejects(claimGuestAdmission({ req, token: freshClaim.token }, activeMember), /consumed/);
      assert.equal(relationshipID((await canonical("commerce-admissions", admissionID, req)).claimedAccount), guestID);
      const claims = await payload.find({ collection: "commerce-claims" as CollectionSlug, where: { admission: { equals: admissionID } }, depth: 0, overrideAccess: true, req });
      assert.equal(claims.totalDocs, 1);
      const storedClaim = await canonical("commerce-claims", String(claims.docs[0].id), req);
      assert.equal(storedClaim.tokenDigest === createHash("sha256").update(freshClaim.token).digest("hex"), true,
        "Persisted digest must match the current bearer");
      // Read the whole SQL row, not a Payload field projection that may omit a column.
      const adapter = payload.db as unknown as PostgresAdapter;
      const raw = await adapter.sessions[String(tx)].db.execute(sql`
        SELECT to_jsonb(claim)::text AS row_text FROM commerce_claims AS claim WHERE id = ${storedClaim.id}
      `);
      assert.equal(raw.rows.length, 1);
      const rowText = raw.rows[0].row_text;
      assert.ok(typeof rowText === "string", "Raw claim row must be present");
      assert.equal(rowText.includes(oldClaim.token), false, "Rotated bearer must not appear in storage");
      assert.equal(rowText.includes(freshClaim.token), false, "Current bearer must not appear in storage");
      assert.equal(typeof storedClaim.consumedAt, "string");
      req.user = f.admin;
      const action = { req, admissionID, kind: "part-i-drink" as const, actionID: "registered-guest-action" };
      assert.deepEqual(await redeemGuestBenefit(action), { ordinal: 1 });
      assert.deepEqual(await redeemGuestBenefit(action), { ordinal: 1 });
      const redemptions = await payload.find({ collection: "commerce-redemptions" as CollectionSlug, where: { admission: { equals: admissionID } }, depth: 0, overrideAccess: true, req });
      assert.equal(redemptions.totalDocs, 1);
      assert.equal((await canonical("commerce-admissions", admissionID, req)).status, "checked-in");
    } finally { await payload.db.rollbackTransaction(tx); }
  });

  for (const boundary of ["stock", "event capacity", "one unit per buyer/release"] as const) {
    await t.test(`concurrent attempts cannot exceed ${boundary}`, async () => {
      const f = await fixture(1);
      if (boundary === "stock") await payload.db.updateOne({ collection: "products", id: f.productID, data: { inventory: 1 } });
      if (boundary === "event capacity") await payload.db.updateOne({ collection: "commerce-events", id: f.eventID, data: { capacity: 1 } });
      const winningID = randomUUID(), losingID = randomUUID();
      const winner = await request(f.user), loser = await request(f.user);
      const winnerTx = await begin(winner);
      let loserTx: Awaited<ReturnType<typeof begin>> | undefined;
      let winnerCommitted = false;
      let pending: Promise<PromiseSettledResult<Awaited<ReturnType<typeof reserve>>>[]> | undefined;
      const adapter = payload.db as unknown as PostgresAdapter;
      try {
        loserTx = await begin(loser);
        const winnerDB = adapter.sessions[String(winnerTx)].db;
        const loserDB = adapter.sessions[String(loserTx)].db;
        const holder = (await winnerDB.execute(sql`SELECT pg_backend_pid() AS pid`)).rows[0].pid;
        const waiter = (await loserDB.execute(sql`SELECT pg_backend_pid() AS pid`)).rows[0].pid;
        assert.ok(typeof holder === "number" && typeof waiter === "number" && holder !== waiter);
        const reserved = await reserve({ ...f, transactionID: winningID }, winner);
        assert.equal(reserved.attemptID, winningID);

        // Both calls reach this resource lock first (distinct attempt locks).
        // Match the exact bigint advisory key, not a row/unique-index wait or a
        // different advisory lock that could mask a missing allowance lock.
        const allowanceKey = createHash("sha256").update(JSON.stringify([f.customerID, f.productID])).digest("hex");
        const lockName = `commerce:allowance:${allowanceKey}`;
        pending = Promise.allSettled([reserve({ ...f, transactionID: losingID }, loser)]);
        let observed = false;
        for (let i = 0; i < 100; i++) {
          const { rows } = await adapter.drizzle.execute(sql`
            WITH target AS (SELECT hashtextextended(${lockName}, 0) AS key)
            SELECT 1 FROM pg_locks AS waiting CROSS JOIN target
            WHERE waiting.pid = ${waiter} AND waiting.locktype = 'advisory' AND NOT waiting.granted
              AND waiting.objsubid = 1
              AND waiting.classid::bigint = ((target.key >> 32) & 4294967295::bigint)
              AND waiting.objid::bigint = (target.key & 4294967295::bigint)
              AND ${holder}::integer = ANY(pg_blocking_pids(waiting.pid))
          `);
          if (rows.length === 1) { observed = true; break; }
          await delay(20);
        }
        assert.equal(observed, true, "Losing backend must wait on the winner's shared allowance lock before commit");
        await payload.db.commitTransaction(winnerTx);
        winnerCommitted = true;
        const [result] = await pending;
        assert.equal(result.status, "rejected", "The loser must reject after the winner commits");
        if (result.status === "rejected") {
          assert.match(String(result.reason), boundary === "one unit per buyer/release"
            ? /allowance exceeded/ : /Insufficient product or guaranteed admission capacity/);
        }
      } finally {
        try {
          if (!winnerCommitted) await payload.db.rollbackTransaction(winnerTx);
        } finally {
          // Release the blocker before joining the contender; never commit the loser.
          if (pending) await pending;
          if (loserTx) await payload.db.rollbackTransaction(loserTx);
        }
      }
      assert.equal((await related("commerce-reservations", "attemptID", winningID)).totalDocs, 1);
      assert.equal((await related("commerce-reservations", "attemptID", losingID)).totalDocs, 0);
      const allowances = await related("commerce-allowances", "customer", f.customerID);
      assert.equal(allowances.totalDocs, 1);
      const allowance = await canonical("commerce-allowances", String(allowances.docs[0].id));
      assert.equal(allowance.reservedQuantity, 1);
      assert.equal(allowance.paidQuantity, 0);
      assert.equal((await canonical("products", f.productID)).reservedQuantity, 1);
      assert.equal((await canonical("commerce-events", f.eventID)).reservedQuantity, 1);
    });
  }
});
