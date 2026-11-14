import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Socket } from "node:net";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { loadEnvConfig } from "@next/env";
import { sql, type PostgresAdapter } from "@payloadcms/db-postgres";
import type { CollectionSlug, Endpoint, PayloadRequest, TypedUser } from "payload";
import type { PaymentAdapter } from "@payloadcms/plugin-ecommerce/types";
import { reservePurchase } from "../../../src/lib/commerce/reservations";
import { acceptUnitReturns, disposeReturnedUnits } from "../../../src/lib/commerce/returns";
import { assignGuestName, checkInGuest, claimGuestAdmission, issueGuestClaim, redeemGuestBenefit } from "../../../src/lib/commerce/guests";
import { withCommerceWrite } from "../../../src/lib/commerce/access";
import { commerceSnapshotHash } from "../../../src/lib/commerce/snapshot-hash";
import type { CommerceSnapshot } from "../../../src/lib/commerce/contracts";
import { capturePayloadTestLifecycle } from "../../support/payload-lifecycle";
import { createPortOneAdapter } from "../../../src/lib/commerce/portone/adapter";
import { assertPaymentRiskReviewed, retireFailedPayment } from "../../../src/lib/commerce/portone/review";

// Explicit opt-in only. No migrations, schema push, real payment transport,
// emails, or existing customer/order mutation is performed by this suite.
test("real Payload commerce inventory, CMS concurrency and held return acceptance", {
  skip: process.env.COMMERCE_PAYLOAD_DATABASE_TESTS !== "1", timeout: 90_000,
}, async (t) => {
  process.env.DISABLE_PAYLOAD_HMR = "true";
  loadEnvConfig(fileURLToPath(new URL("../../../", import.meta.url)));
  const database = new URL(process.env.DATABASE_URI ?? "");
  assert.ok(["postgres:", "postgresql:"].includes(database.protocol));
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(database.hostname));
  assert.ok(database.pathname.length > 1);
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
  let fixtures: { collection: CollectionSlug; id: string }[] = [];
  t.after(async () => {
    try {
      for (const fixture of [...fixtures].reverse()) await payload.db.deleteOne({ collection: fixture.collection, where: { id: { equals: fixture.id } } });
    } finally { await close(); }
    assert.equal(blockedOutbound, 0, "No provider transport may be attempted");
  });
  const selectedDatabase = await (payload.db as unknown as PostgresAdapter).drizzle.execute(sql`SELECT current_database() AS name`);
  assert.equal(selectedDatabase.rows[0].name, decodeURIComponent(database.pathname.slice(1)), "Payload must use the selected local database");

  const request = async (user?: TypedUser) => createLocalReq({ user }, payload);
  const begin = async (req: PayloadRequest) => {
    const id = await payload.db.beginTransaction();
    if (!id) throw new Error("PostgreSQL transactions required");
    req.transactionID = id;
    return id;
  };
  const canonical = async (collection: string, id: string, req?: PayloadRequest) => {
    const row = await payload.db.findOne({ collection: collection as CollectionSlug, where: { id: { equals: id } }, draftsEnabled: false, req });
    assert.ok(row);
    return row as Record<string, unknown> & { id: string };
  };

  async function fixture(quantity: number) {
    const customerID = randomUUID(), adminID = randomUUID(), eventID = randomUUID(), productID = randomUUID(), cartID = randomUUID(), transactionID = randomUUID();
    const now = new Date().toISOString();
    const snapshot: CommerceSnapshot = {
      version: 1, customerID, eventID, productID, releaseID: productID, cartID, quantity, currency: "KRW", unitAmount: 10000, shippingAmount: 3000, totalAmount: quantity * 10000 + 3000,
      orderName: "Owned commerce acceptance fixture", productVersion: now, eventVersion: now,
      shippingAddress: { country: "KR", recipientName: "Fixture recipient", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture address, not for delivery" },
    };
    const rows = [
      { collection: "users", id: customerID, data: { email: `commerce-${customerID}@fixture.invalid`, name: "Commerce fixture", emailVerified: true, membershipStatus: "applicant" } },
      { collection: "admins", id: adminID, data: { email: `commerce-${adminID}@fixture.invalid`, name: "Commerce fixture operator", role: "admin" } },
      { collection: "commerce-events", id: eventID, data: { name: "Owned event fixture", publicationApproved: true, capacity: 10, transportCapacity: 10, reservedQuantity: 0, committedQuantity: 0, partIStartsAt: new Date(Date.now() - 60000).toISOString(), partIEndsAt: new Date(Date.now() + 3600000).toISOString(), claimCutoffAt: new Date(Date.now() + 1800000).toISOString() } },
      { collection: "products", id: productID, data: { title: "Published fixture", description: "Owned fixture, never offered", _status: "published", publicationApproved: true, event: eventID, inventory: 10, reservedQuantity: 0, priceInKRWEnabled: true, priceInKRW: 10000, shippingFeeKRW: 3000, dispatchSchedule: "Fixture only", saleStartsAt: new Date(Date.now() - 60000).toISOString(), saleEndsAt: new Date(Date.now() + 3600000).toISOString() } },
      { collection: "carts", id: cartID, data: { customer: customerID, currency: "KRW", subtotal: quantity * 10000, items: [{ id: randomUUID(), product: productID, quantity }] } },
      { collection: "transactions", id: transactionID, data: { customer: customerID, cart: cartID, currency: "KRW", amount: snapshot.totalAmount, status: "pending", paymentMethod: "portone", items: [{ id: randomUUID(), product: productID, quantity }], portone: { paymentID: transactionID.replaceAll("-", ""), prepareKey: commerceSnapshotHash(snapshot), snapshotHash: commerceSnapshotHash(snapshot), snapshot, storeID: "fixture-store", channelKey: "fixture-channel" } } },
    ];
    const req = await request();
    const tx = await begin(req);
    try {
      for (const row of rows) await payload.db.create({ collection: row.collection as CollectionSlug, customID: row.id, data: { ...row.data, createdAt: now, updatedAt: now }, req });
      await payload.db.commitTransaction(tx);
      fixtures = [...fixtures, ...rows.map(({ collection, id }) => ({ collection: collection as CollectionSlug, id }))];
    } catch (error) { await payload.db.rollbackTransaction(tx); throw error; }
    const user = { ...await canonical("users", customerID), collection: "users" } as TypedUser;
    const admin = { ...await canonical("admins", adminID), collection: "admins", _strategy: "staff-better-auth" } as unknown as TypedUser;
    return { snapshot, customerID, adminID, eventID, productID, cartID, transactionID, user, admin };
  }

  // Private installed endpoint is deliberately resolved relative to the pinned
  // package entry: this tests its REAL finalizer, not a reimplemented simulator.
  const packageEntry = createRequire(import.meta.url).resolve("@payloadcms/plugin-ecommerce");
  const moduleURL = new URL("./endpoints/confirmOrder.js", pathToFileURL(packageEntry));
  const { confirmOrderHandler } = await import(moduleURL.href) as { confirmOrderHandler: (args: Record<string, unknown>) => Endpoint["handler"] };
  async function settle(f: Awaited<ReturnType<typeof fixture>>, req: PayloadRequest, actualMethod?: PaymentAdapter, expectedStatus = 200) {
    const method: PaymentAdapter = actualMethod ?? {
      name: "fixture", label: "Injected provider-free fixture",
      group: { name: "fixture", type: "group", fields: [] },
      initiatePayment: async () => { throw new Error("No provider initiation in DB acceptance"); },
      confirmOrder: async ({ finalizeOrder }) => {
        if (!finalizeOrder) throw new Error("Installed finalizer unavailable");
        await reservePurchase({ req, attemptID: f.transactionID, customerID: f.customerID, productID: f.productID, releaseID: f.productID, eventID: f.eventID, quantity: f.snapshot.quantity, snapshotHash: commerceSnapshotHash(f.snapshot) });
        const order = await withCommerceWrite(req, () => finalizeOrder({ transactionID: f.transactionID, orderData: { amount: f.snapshot.totalAmount, currency: "KRW", customer: f.customerID, items: [{ product: f.productID, quantity: f.snapshot.quantity }], status: "processing", commerceVersion: "commerce-v1", commerceAttemptID: f.transactionID, commerceSnapshot: f.snapshot } }));
        return { message: "Synthetic payment confirmed", orderID: String(order.id), transactionID: f.transactionID };
      },
    };
    req.data = { cartID: f.cartID, transactionID: f.transactionID, paymentID: f.transactionID.replaceAll("-", "") };
    const response = await confirmOrderHandler({ paymentMethod: method, currenciesConfig: { defaultCurrency: "KRW", supportedCurrencies: [{ code: "KRW", decimals: 0, label: "Won", symbol: "₩" }] } })(req);
    assert.equal(response.status, expectedStatus, "Installed finalizer must return the expected provider-free outcome");
    return await response.json() as { orderID: string };
  }

  await t.test("interrupted official finalization rolls back and retries without double stock or admissions", async (interruptedTest) => {
    const f = await fixture(1);
    const interruptedReq = await request(f.user);
    const interruptedTx = await begin(interruptedReq);
    const create = payload.create;
    let injectedFailure = false;
    let observedDeductedStock = false;
    interruptedTest.mock.method(payload, "create", async (...args: Parameters<typeof payload.create>) => {
      if (args[0].collection === "commerce-admissions" && !injectedFailure) {
        injectedFailure = true;
        assert.equal((await canonical("products", f.productID, interruptedReq)).inventory, 9, "Admission failure occurs after actual plugin stock deduction");
        observedDeductedStock = true;
        throw new Error("Synthetic interruption after inventory settlement");
      }
      return Reflect.apply(create, payload, args);
    });
    try {
      await settle(f, interruptedReq, undefined, 500);
      assert.equal(injectedFailure, true, "Failure must occur in the actual admission creation hook");
      assert.equal(observedDeductedStock, true, "Stock deduction must be observed before injecting the interruption");
      assert.equal((await canonical("products", f.productID)).inventory, 10, "Installed handler automatically rolls back interrupted finalization");
    } finally {
      interruptedTest.mock.restoreAll();
      await payload.db.rollbackTransaction(interruptedTx);
    }
    assert.equal((await canonical("products", f.productID)).inventory, 10);
    assert.equal((await canonical("products", f.productID)).reservedQuantity, 0);
    assert.equal((await canonical("commerce-events", f.eventID)).reservedQuantity, 0);
    assert.equal((await canonical("commerce-events", f.eventID)).committedQuantity, 0);
    assert.equal((await canonical("transactions", f.transactionID)).status, "pending");
    assert.equal((await canonical("transactions", f.transactionID)).order == null, true);
    const reservations = await payload.find({ collection: "commerce-reservations" as CollectionSlug, where: { attemptID: { equals: f.transactionID } }, depth: 0, overrideAccess: true });
    const allowances = await payload.find({ collection: "commerce-allowances" as CollectionSlug, where: { customer: { equals: f.customerID } }, depth: 0, overrideAccess: true });
    assert.equal(reservations.totalDocs, 0);
    assert.equal(allowances.totalDocs, 0);
    const orders = await payload.find({ collection: "orders", where: { transactions: { equals: f.transactionID } }, depth: 0, overrideAccess: true });
    const admissions = await payload.find({ collection: "commerce-admissions" as CollectionSlug, where: { transaction: { equals: f.transactionID } }, depth: 0, overrideAccess: true });
    assert.equal(orders.totalDocs, 0);
    assert.equal(admissions.totalDocs, 0);
    const retryReq = await request(f.user);
    const retryTx = await begin(retryReq);
    try {
      const recovered = await settle(f, retryReq);
      assert.equal((await settle(f, retryReq)).orderID, recovered.orderID);
      assert.equal((await canonical("products", f.productID, retryReq)).inventory, 9);
      const recoveredAdmissions = await payload.find({ collection: "commerce-admissions" as CollectionSlug, where: { order: { equals: recovered.orderID } }, depth: 0, overrideAccess: true, req: retryReq });
      assert.equal(recoveredAdmissions.totalDocs, 1);
    } finally { await payload.db.rollbackTransaction(retryTx); }
  });

  await t.test("actual PortOne adapter validates injected PAID proof and finalizes stock exactly once", async () => {
    const f = await fixture(1);
    const req = await request(f.user);
    const tx = await begin(req);
    try {
      await reservePurchase({ req, attemptID: f.transactionID, customerID: f.customerID, productID: f.productID, releaseID: f.productID, eventID: f.eventID, quantity: 1, snapshotHash: commerceSnapshotHash(f.snapshot) });
      const config = { mode: "test" as const, origin: "http://localhost:3000", storeId: "fixture-store", channelKey: "fixture-channel", apiSecret: "unused-synthetic-secret", webhookSecret: "unused-synthetic-webhook", localKpnTestCheckout: true };
      let providerReads = 0;
      const method = createPortOneAdapter({ config, getPayment: async ({ paymentId, storeId }) => {
        providerReads++;
        assert.equal(paymentId, f.transactionID.replaceAll("-", ""));
        assert.equal(storeId, config.storeId);
        return { id: paymentId, status: "PAID", storeId, channel: { key: config.channelKey, type: "TEST" }, customer: { id: f.customerID }, currency: "KRW", amount: { total: f.snapshot.totalAmount, paid: f.snapshot.totalAmount, cancelled: 0 }, disputes: [] };
      } });
      const first = await settle(f, req, method);
      assert.equal((await settle(f, req, method)).orderID, first.orderID);
      assert.equal(providerReads, 2, "Each confirmation rechecks authoritative injected evidence");
      assert.equal((await canonical("products", f.productID, req)).inventory, 9);
      assert.equal((await canonical("transactions", f.transactionID, req)).status, "succeeded");
      const orders = await payload.find({ collection: "orders", where: { transactions: { equals: f.transactionID } }, depth: 0, overrideAccess: true, req });
      assert.equal(orders.totalDocs, 1);
    } finally { await payload.db.rollbackTransaction(tx); }
  });

  await t.test("verified retirement permits replacement but late PAID durably quarantines the original without reallocating", async () => {
    const f = await fixture(3);
    const initialReq = await request(f.user);
    const initialTx = await begin(initialReq);
    try {
      const reservation = await reservePurchase({ req: initialReq, attemptID: f.transactionID, customerID: f.customerID, productID: f.productID, releaseID: f.productID, eventID: f.eventID, quantity: 3, snapshotHash: commerceSnapshotHash(f.snapshot) });
      const allowances = await payload.find({ collection: "commerce-allowances" as CollectionSlug, where: { customer: { equals: f.customerID } }, limit: 1, depth: 0, overrideAccess: true, req: initialReq });
      await payload.db.commitTransaction(initialTx);
      fixtures = [...fixtures, { collection: "commerce-allowances" as CollectionSlug, id: String(allowances.docs[0].id) }, { collection: "commerce-reservations" as CollectionSlug, id: reservation.id }];
    } catch (error) { await payload.db.rollbackTransaction(initialTx); throw error; }
    const config = { mode: "test" as const, origin: "http://localhost:3000", storeId: "fixture-store", channelKey: "fixture-channel", apiSecret: "unused-synthetic-secret", webhookSecret: "unused-synthetic-webhook", localKpnTestCheckout: true };
    let providerStatus: "FAILED" | "PAID" = "FAILED";
    const deps = { config, getPayment: async ({ paymentId }: { paymentId: string; storeId: string }) => ({ id: paymentId, status: providerStatus, storeId: config.storeId, channel: { key: config.channelKey, type: "TEST" }, customer: { id: f.customerID }, currency: "KRW", amount: { total: f.snapshot.totalAmount, paid: providerStatus === "PAID" ? f.snapshot.totalAmount : 0, cancelled: 0 }, disputes: [] }) };
    const original = { transactionID: f.transactionID, paymentID: f.transactionID.replaceAll("-", "") };
    await retireFailedPayment(await request(f.user), original, deps);
    await retireFailedPayment(await request(f.user), original, deps);
    assert.equal((await canonical("transactions", f.transactionID)).status, "failed");
    assert.equal((await canonical("products", f.productID)).reservedQuantity, 0);
    assert.equal((await canonical("commerce-events", f.eventID)).reservedQuantity, 0);
    const replacementID = randomUUID();
    const replacementReq = await request(f.user);
    const replacementTx = await begin(replacementReq);
    let replacementReservationID: string;
    try {
      await payload.db.create({ collection: "transactions", customID: replacementID, data: { customer: f.customerID, cart: f.cartID, currency: "KRW", amount: f.snapshot.totalAmount, status: "pending", paymentMethod: "portone", items: [{ id: randomUUID(), product: f.productID, quantity: 3 }], portone: { paymentID: replacementID.replaceAll("-", ""), prepareKey: replacementID.replaceAll("-", "").repeat(2), snapshotHash: commerceSnapshotHash(f.snapshot), snapshot: f.snapshot, storeID: config.storeId, channelKey: config.channelKey }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, req: replacementReq });
      const reservation = await reservePurchase({ req: replacementReq, attemptID: replacementID, customerID: f.customerID, productID: f.productID, releaseID: f.productID, eventID: f.eventID, quantity: 3, snapshotHash: commerceSnapshotHash(f.snapshot) });
      replacementReservationID = reservation.id;
      await payload.db.commitTransaction(replacementTx);
      fixtures = [...fixtures, { collection: "transactions", id: replacementID }, { collection: "commerce-reservations" as CollectionSlug, id: reservation.id }];
    } catch (error) { await payload.db.rollbackTransaction(replacementTx); throw error; }
    providerStatus = "PAID";
    await assert.rejects(assertPaymentRiskReviewed(await request(f.user), original, undefined, deps), /requires review/);
    const originalRow = await canonical("transactions", f.transactionID);
    assert.equal(originalRow.status, "failed");
    assert.equal(originalRow.commerceReviewHold, true);
    assert.equal(originalRow.commerceResolutionConflict, true);
    assert.equal(originalRow.order == null, true);
    assert.equal((await canonical("commerce-reservations", replacementReservationID)).state, "reserved");
    assert.equal((await canonical("products", f.productID)).reservedQuantity, 3);
    assert.equal((await canonical("products", f.productID)).inventory, 10);
    assert.equal((await canonical("commerce-events", f.eventID)).reservedQuantity, 3);
    const reservations = await payload.find({ collection: "commerce-reservations" as CollectionSlug, where: { attemptID: { equals: f.transactionID } }, depth: 0, overrideAccess: true });
    assert.equal((reservations.docs[0] as unknown as { state: string }).state, "released");
  });

  await t.test("real plugin finalization decrements main stock without publishing or replaying a CMS draft", async () => {
    const f = await fixture(1);
    const req = await request(f.user);
    const tx = await begin(req);
    try {
      await payload.update({ collection: "products", id: f.productID, data: { title: "Unpublished fixture draft" }, draft: true, overrideAccess: true, req });
      const result = await settle(f, req);
      assert.equal((await settle(f, req)).orderID, result.orderID, "Repeated confirmation returns the canonical order");
      const product = await canonical("products", f.productID, req);
      assert.equal(product.inventory, 9);
      assert.equal(product.reservedQuantity, 0);
      assert.equal(product.title, "Published fixture");
      assert.equal(product._status, "published");
      const versions = await payload.findVersions({ collection: "products", where: { parent: { equals: f.productID } }, limit: 10, overrideAccess: true, req });
      assert.equal(versions.docs.some((version) => version.version.title === "Unpublished fixture draft"), true);
      const admissions = await payload.find({ collection: "commerce-admissions" as CollectionSlug, where: { order: { equals: result.orderID } }, overrideAccess: true, req });
      assert.equal(admissions.totalDocs, 1);
      const orders = await payload.find({ collection: "orders", where: { transactions: { equals: f.transactionID } }, depth: 0, overrideAccess: true, req });
      assert.equal(orders.totalDocs, 1);
    } finally { await payload.db.rollbackTransaction(tx); }
  });

  await t.test("normal customer cart creation and editing preserve plugin calculations", async (cartTest) => {
    const f = await fixture(1);
    const req = await request(f.user);
    const tx = await begin(req);
    try {
      const { getPayloadMemberRuntime } = await import("../../../src/lib/member-auth/payload-runtime");
      const runtime = getPayloadMemberRuntime();
      assert.ok(runtime, "Local canonical membership runtime must be configured");
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
      await payload.db.updateOne({ collection: "products", id: f.productID, data: { images: [{ id: randomUUID(), image: mediaID }] }, req });
      const cart = await payload.create({ collection: "carts", data: { customer: f.customerID, currency: "KRW", items: [{ product: f.productID, quantity: 1 }] }, overrideAccess: false, req });
      assert.equal(cart.subtotal, 10000);
      const edited = await payload.update({ collection: "carts", id: cart.id, data: { items: [{ product: f.productID, quantity: 2 }] }, overrideAccess: false, req });
      assert.equal(edited.subtotal, 20000);
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
      const reservation = await reservePurchase({ req: reserveReq, attemptID: f.transactionID, customerID: f.customerID, releaseID: f.productID, productID: f.productID, eventID: f.eventID, quantity: 1, snapshotHash: commerceSnapshotHash(f.snapshot) });
      const allowance = await payload.find({ collection: "commerce-allowances" as CollectionSlug, where: { customer: { equals: f.customerID } }, limit: 1, overrideAccess: true, req: reserveReq });
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
      fixtures = [...fixtures, { collection: "commerce-allowances" as CollectionSlug, id: String(allowance.docs[0].id) }, { collection: "commerce-reservations" as CollectionSlug, id: reservation.id }];
      await save;
      assert.equal((await canonical("commerce-events", f.eventID, cmsReq)).reservedQuantity, 1);
    } finally {
      if (!reserveCommitted) await payload.db.rollbackTransaction(reserveTx);
      if (save) await save.catch(() => undefined);
      await payload.db.rollbackTransaction(cmsTx);
    }
  });

  await t.test("held partial returns restore only accepted allowance and retain the financial hold", async () => {
    const f = await fixture(3);
    const req = await request(f.user);
    const tx = await begin(req);
    try {
      const { orderID } = await settle(f, req);
      await withCommerceWrite(req, () => payload.update({ collection: "transactions", id: f.transactionID, data: { commerceReviewHold: true }, overrideAccess: true, req }));
      req.user = f.admin;
      await acceptUnitReturns({ req, orderID, units: [2], evidenceID: `fixture-return-${randomUUID()}` });
      assert.deepEqual(await acceptUnitReturns({ req, orderID, units: [2], evidenceID: "replayed-fixture-evidence" }), { newlyAcceptedUnits: [] });
      const allowance = await payload.find({ collection: "commerce-allowances" as CollectionSlug, where: { customer: { equals: f.customerID } }, overrideAccess: true, req });
      assert.equal((allowance.docs[0] as unknown as { paidQuantity: number }).paidQuantity, 2);
      assert.equal((await canonical("products", f.productID, req)).inventory, 7);
      assert.equal((await canonical("transactions", f.transactionID, req)).commerceReviewHold, true);
      const admission = await payload.find({ collection: "commerce-admissions" as CollectionSlug, where: { orderUnitKey: { equals: `${orderID}:1` } }, overrideAccess: true, req });
      await assert.rejects(redeemGuestBenefit({ req, admissionID: String(admission.docs[0].id), kind: "part-i-drink", actionID: "fixture-held-action-1" }), /held.*review/i);
      await disposeReturnedUnits({ req, orderID, units: [2], disposition: "restock" });
      await disposeReturnedUnits({ req, orderID, units: [2], disposition: "restock" });
      assert.equal((await canonical("products", f.productID, req)).inventory, 8);
    } finally { await payload.db.rollbackTransaction(tx); }
  });

  await t.test("named admission, rotated single-use claim and idempotent redemption use real Payload records", async () => {
    // Source compatibility only: unit 1 is reserved self; use pending gift unit 2.
    // This gated legacy characterization approves neither self activation nor name-only entry.
    const f = await fixture(2);
    const req = await request(f.user);
    const tx = await begin(req);
    try {
      const { orderID } = await settle(f, req);
      const admissions = await payload.find({ collection: "commerce-admissions" as CollectionSlug, where: { and: [{ order: { equals: orderID } }, { unit: { equals: 2 } }] }, depth: 0, overrideAccess: true, req });
      assert.equal(admissions.docs.length, 1, "Exactly the pending gift unit is selected");
      const admissionID = String(admissions.docs[0].id);
      await assignGuestName({ req, admissionID, guestName: "Named fixture guest" });
      req.user = f.admin;
      await checkInGuest({ req, admissionID });
      assert.equal((await canonical("commerce-admissions", admissionID, req)).claimedAccount == null, true, "Name-only entry does not require registration");
      await assert.rejects(redeemGuestBenefit({ req, admissionID, kind: "part-i-drink", actionID: "unregistered-guest-action" }), /checked-in admission/);
      req.user = f.user;
      const oldClaim = await issueGuestClaim({ req, admissionID });
      const freshClaim = await issueGuestClaim({ req, admissionID });
      assert.notEqual(freshClaim.token, oldClaim.token);
      const guestID = randomUUID();
      await payload.db.create({ collection: "users", customID: guestID, data: { email: `guest-${guestID}@fixture.invalid`, name: "Verified fixture guest", emailVerified: true, membershipStatus: "applicant", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, req });
      req.user = { id: guestID, collection: "users" } as TypedUser;
      const activeMember = async (customerID: string) => customerID === guestID;
      await assert.rejects(claimGuestAdmission({ req, token: oldClaim.token }, activeMember), /Invalid/);
      assert.deepEqual(await claimGuestAdmission({ req, token: freshClaim.token }, activeMember), { admissionID });
      await assert.rejects(claimGuestAdmission({ req, token: freshClaim.token }, activeMember), /consumed/);
      const claims = await payload.find({ collection: "commerce-claims" as CollectionSlug, where: { admission: { equals: admissionID } }, depth: 0, overrideAccess: true, req });
      assert.equal(claims.totalDocs, 1);
      assert.equal(JSON.stringify(claims.docs).includes(freshClaim.token), false, "Only token digest is persisted");
      req.user = f.admin;
      const action = { req, admissionID, kind: "part-i-drink" as const, actionID: "registered-guest-action" };
      assert.deepEqual(await redeemGuestBenefit(action), { ordinal: 1 });
      assert.deepEqual(await redeemGuestBenefit(action), { ordinal: 1 });
      const redemptions = await payload.find({ collection: "commerce-redemptions" as CollectionSlug, where: { admission: { equals: admissionID } }, depth: 0, overrideAccess: true, req });
      assert.equal(redemptions.totalDocs, 1);
      assert.equal((await canonical("commerce-admissions", admissionID, req)).status, "checked-in");
    } finally { await payload.db.rollbackTransaction(tx); }
  });

  for (const boundary of ["stock", "event capacity", "net-three allowance"] as const) {
    await t.test(`concurrent attempts cannot exceed ${boundary}`, async () => {
      const f = await fixture(1);
      if (boundary === "stock") await payload.db.updateOne({ collection: "products", id: f.productID, data: { inventory: 1 } });
      if (boundary === "event capacity") await payload.db.updateOne({ collection: "commerce-events" as CollectionSlug, id: f.eventID, data: { capacity: 1 } });
      const quantity = boundary === "net-three allowance" ? 2 : 1;
      const attempt = async (attemptID: string) => {
        const req = await request(f.user);
        const tx = await begin(req);
        try {
          const reservation = await reservePurchase({ req, attemptID, customerID: f.customerID, productID: f.productID, releaseID: f.productID, eventID: f.eventID, quantity, snapshotHash: commerceSnapshotHash(f.snapshot) });
          const allowances = await payload.find({ collection: "commerce-allowances" as CollectionSlug, where: { customer: { equals: f.customerID } }, depth: 0, limit: 1, overrideAccess: true, req });
          await payload.db.commitTransaction(tx);
          fixtures = [...fixtures, { collection: "commerce-allowances" as CollectionSlug, id: String(allowances.docs[0].id) }, { collection: "commerce-reservations" as CollectionSlug, id: reservation.id }];
          return reservation;
        } catch (error) { await payload.db.rollbackTransaction(tx); throw error; }
      };
      const results = await Promise.allSettled([attempt(randomUUID()), attempt(randomUUID())]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      const rejection = results.find((result) => result.status === "rejected");
      assert.equal(rejection?.status, "rejected");
      if (rejection?.status === "rejected") assert.match(String(rejection.reason), boundary === "net-three allowance" ? /allowance exceeded/ : /Insufficient product or guaranteed admission capacity/);
      assert.equal((await canonical("products", f.productID)).reservedQuantity, quantity);
      assert.equal((await canonical("commerce-events", f.eventID)).reservedQuantity, quantity);
    });
  }
});
