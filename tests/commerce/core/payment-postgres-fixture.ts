import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { Socket } from "node:net";
import { pathToFileURL } from "node:url";
import { postgresAdapter, type PostgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig, createLocalReq, getPayload, type CollectionSlug, type Endpoint, type Payload, type TypedUser } from "payload";
import type { Pool } from "pg";
import type { TestContext } from "node:test";
import { commercePlugin } from "../../../src/lib/commerce/ecommerce";
import { commerceDomainPlugin } from "../../../src/lib/commerce/domain";
import { CommercePublication } from "../../../src/lib/commerce/catalogue";
import { inPaymentEndpoint, inPaymentTransaction } from "../../../src/lib/commerce/_shared/transaction";
import { withCommerceWrite } from "../../../src/lib/commerce/access";
import { reservePurchase } from "../../../src/lib/commerce/reservations";
import { commerceSnapshotHash } from "../../../src/lib/commerce/snapshot-hash";
import { createPortOneAdapter } from "../../../src/lib/commerce/portone/adapter";
import { flushDeferredPaymentRisk } from "../../../src/lib/commerce/portone/review";
import type { CommerceSnapshot } from "../../../src/lib/commerce/contracts";
import { capturePayloadTestLifecycle } from "../../support/payload-lifecycle";

// Fixed isolated target; neither DATABASE_URI nor application .env is consulted.
export const databaseURL = "postgres://postgres@127.0.0.1:55473/i0db_proof";
export const providerConfig = { origin: "http://127.0.0.1:55473", storeId: "fixture-store", channelKey: "fixture-channel",
  apiSecret: "unused-fixture-value", webhookSecret: "unused-fixture-value", localKpnTestCheckout: false };

export function isolateTransport(t: TestContext) {
  let blocked = 0;
  t.mock.method(globalThis, "fetch", async () => { blocked++; throw new Error("HTTP forbidden by isolated DB proof"); });
  const connect = Socket.prototype.connect;
  t.mock.method(Socket.prototype, "connect", function (this: Socket, ...args: Parameters<Socket["connect"]>) {
    const first: unknown = Array.isArray(args[0]) ? args[0][0] : args[0];
    const options = typeof first === "object" && first !== null ? first as Record<string, unknown> : null;
    const port = Number(options ? options.port : first);
    const host = options ? String(options.host ?? "localhost") : String(args[1]);
    if (options?.path || port !== 55473 || host !== "127.0.0.1") {
      blocked++;
      throw new Error("Only the disposable loopback database is allowed");
    }
    return Reflect.apply(connect, this, args);
  });
  t.after(() => assert.equal(blocked, 0, "No external transport attempted"));
}

export async function openProofDatabase(push = true) {
  // Fail before schema creation unless Docker still identifies the owned disposable target.
  const inspected: unknown = JSON.parse(execFileSync("docker", ["inspect", "sphmrs-i0db-20261113-81f79e8f"], { encoding: "utf8", maxBuffer: 65536 }));
  assert.ok(Array.isArray(inspected) && inspected.length === 1);
  const container = inspected[0] as { Name: string; State: { Running: boolean }; Config: { Env: string[] };
    HostConfig: { Memory: number; PortBindings: Record<string, { HostIp: string; HostPort: string }[]> };
    Mounts: { Name?: string; Destination: string }[] };
  assert.equal(container.Name, "/sphmrs-i0db-20261113-81f79e8f");
  assert.equal(container.State.Running, true);
  assert.equal(container.Config.Env.includes("POSTGRES_DB=i0db_proof"), true);
  assert.deepEqual(container.HostConfig.PortBindings, { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "55473" }] });
  assert.equal(container.HostConfig.Memory, 384 * 1024 * 1024);
  assert.equal(container.Mounts.some((mount) => mount.Name === "sphmrs-i0db-20261113-81f79e8f-data" && mount.Destination === "/var/lib/postgresql/data"), true);
  const config = await buildConfig({
    secret: randomUUID(), telemetry: false, admin: { user: "admins", disable: true },
    typescript: { autoGenerate: false },
    db: postgresAdapter({ pool: { connectionString: databaseURL, max: 6, connectionTimeoutMillis: 5000,
      options: "-c statement_timeout=15000 -c idle_in_transaction_session_timeout=15000" },
      idType: "uuid", push, migrationDir: "tests/commerce/core" }),
    collections: [
      { slug: "admins", auth: true, fields: [] },
      { slug: "users", fields: [{ name: "email", type: "email" }, { name: "name", type: "text" }] },
      { slug: "media", upload: { disableLocalStorage: true }, fields: [] },
    ],
    globals: [CommercePublication], plugins: [commercePlugin, commerceDomainPlugin],
  });
  const payload = await getPayload({ config, key: randomUUID() });
  const close = capturePayloadTestLifecycle(payload);
  const adapter = payload.db as unknown as PostgresAdapter;
  const pool = adapter.pool as Pool;
  const identity = await pool.query("SELECT current_database() AS name, current_setting('server_version') AS version");
  assert.equal(identity.rows[0].name, "i0db_proof");
  return { payload, adapter, pool, close, version: String(identity.rows[0].version) };
}

export async function seedAttempt(payload: Payload) {
  const customerID = randomUUID(), eventID = randomUUID(), productID = randomUUID(), cartID = randomUUID(), transactionID = randomUUID();
  const now = new Date().toISOString();
  const snapshot: CommerceSnapshot = { version: 1, customerID, eventID, productID, releaseID: productID, cartID,
    quantity: 1, currency: "KRW", unitAmount: 10000, shippingAmount: 3000, totalAmount: 13000,
    orderName: "Isolated database fixture", productVersion: now, eventVersion: now,
    shippingAddress: { country: "KR", recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture only" } };
  const rows = [
    { collection: "users", id: customerID, data: { email: `${customerID}@fixture.invalid`, name: "Fixture" } },
    { collection: "commerce-events", id: eventID, data: { name: "Fixture", publicationApproved: true, capacity: 10, transportCapacity: 10,
      reservedQuantity: 0, committedQuantity: 0, partIStartsAt: now, partIEndsAt: new Date(Date.now() + 3600000).toISOString(), claimCutoffAt: now } },
    { collection: "products", id: productID, data: { title: "Fixture", description: "Never offered", _status: "published", publicationApproved: true,
      event: eventID, inventory: 10, reservedQuantity: 0, priceInKRWEnabled: true, priceInKRW: 10000, shippingFeeKRW: 3000, dispatchSchedule: "Fixture",
      saleStartsAt: new Date(Date.now() - 60000).toISOString(), saleEndsAt: new Date(Date.now() + 3600000).toISOString() } },
    { collection: "carts", id: cartID, data: { customer: customerID, currency: "KRW", subtotal: 10000, items: [{ id: randomUUID(), product: productID, quantity: 1 }] } },
    { collection: "transactions", id: transactionID, data: { customer: customerID, cart: cartID, currency: "KRW", amount: 13000, status: "pending",
      paymentMethod: "portone", items: [{ id: randomUUID(), product: productID, quantity: 1 }], portone: { paymentID: transactionID.replaceAll("-", ""),
        prepareKey: commerceSnapshotHash(snapshot), snapshotHash: commerceSnapshotHash(snapshot), snapshot, storeID: providerConfig.storeId, channelKey: providerConfig.channelKey } } },
  ];
  // Only fixture preparation bypasses business hooks; settlement uses unmodified Local API/hooks.
  for (const row of rows) await payload.db.create({ collection: row.collection as CollectionSlug, customID: row.id, data: { ...row.data, createdAt: now, updatedAt: now } });
  const user = { id: customerID, email: `${customerID}@fixture.invalid`, collection: "users" } as TypedUser;
  const req = await createLocalReq({ user }, payload);
  await inPaymentTransaction(req, async () => {
    try {
      return await withCommerceWrite(req, () => reservePurchase({ req, attemptID: transactionID,
        customerID, productID, releaseID: productID, eventID, quantity: 1, snapshotHash: commerceSnapshotHash(snapshot) }));
    } catch (error) {
      // Preserve the bounded first error before native ownership handling replaces it.
      console.error("reservation first error:", error instanceof Error ? error.message : "non-Error");
      throw error;
    }
  });
  return { snapshot, user, customerID, eventID, productID, cartID, transactionID };
}

export type Attempt = Awaited<ReturnType<typeof seedAttempt>>;

export async function confirmation(payload: Payload, f: Attempt, risk = false) {
  const req = await createLocalReq({ user: f.user }, payload);
  req.data = { cartID: f.cartID, transactionID: f.transactionID, paymentID: f.transactionID.replaceAll("-", "") };
  const deps = { config: providerConfig, reviewedChannel: providerConfig,
    getPayment: async () => ({ id: f.transactionID.replaceAll("-", ""), storeId: providerConfig.storeId, status: "PAID",
      channel: { key: providerConfig.channelKey, type: "TEST" }, customer: { id: f.customerID }, currency: "KRW",
      amount: { total: 13000, paid: 13000, cancelled: 0 }, disputes: risk ? [true] : [] }) };
  const entry = createRequire(import.meta.url).resolve("@payloadcms/plugin-ecommerce");
  const { confirmOrderHandler } = await import(new URL("./endpoints/confirmOrder.js", pathToFileURL(entry)).href) as {
    confirmOrderHandler: (args: Record<string, unknown>) => Endpoint["handler"];
  };
  const handler = confirmOrderHandler({ paymentMethod: createPortOneAdapter(deps),
    currenciesConfig: { defaultCurrency: "KRW", supportedCurrencies: [{ code: "KRW", decimals: 0, label: "Won", symbol: "KRW" }] } });
  return { req, run: async () => {
    try { return await inPaymentEndpoint(req, handler); }
    finally { await flushDeferredPaymentRisk(req); }
  } };
}

export async function effects(pool: Pool, f: Attempt) {
  const { rows } = await pool.query(`SELECT
    (SELECT count(*)::int FROM orders WHERE commerce_attempt_id=$1::text) AS orders,
    (SELECT inventory FROM products WHERE id=$2::uuid) AS stock,
    (SELECT reserved_quantity FROM products WHERE id=$2::uuid) AS reserved,
    (SELECT paid_quantity FROM commerce_allowances WHERE customer_id=$3::uuid AND release_id=$2::text) AS allowance,
    (SELECT count(*)::int FROM commerce_admissions WHERE transaction_id=$1::uuid) AS admissions,
    (SELECT count(*)::int FROM orders WHERE commerce_attempt_id=$1::text AND fulfillment_status='pending') AS fulfillment,
    (SELECT status FROM transactions WHERE id=$1::uuid) AS status`, [f.transactionID, f.productID, f.customerID]);
  return rows[0] as Record<string, unknown>;
}
