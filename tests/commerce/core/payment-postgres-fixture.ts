import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { Socket } from "node:net";
import { pathToFileURL } from "node:url";
import { postgresAdapter, sql, type PostgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig, createLocalReq, getPayload, type CollectionConfig, type CollectionSlug, type Endpoint, type JobsConfig, type Payload, type PayloadRequest, type TypedUser } from "payload";
import { Pool } from "pg";
import type { TestContext } from "node:test";
import { commercePlugin, createSecureCart } from "../../../src/lib/commerce/ecommerce";
import { commerceDomainPlugin } from "../../../src/lib/commerce/domain";
import { CommercePublication } from "../../../src/lib/commerce/catalogue";
import { inPaymentEndpoint, inPaymentTransaction } from "../../../src/lib/commerce/_shared/transaction";
import { withCommerceWrite } from "../../../src/lib/commerce/access";
import { reservePurchase } from "../../../src/lib/commerce/reservations";
import { commerceSnapshotHash } from "../../../src/lib/commerce/snapshot-hash";
import { createPortOneAdapter } from "../../../src/lib/commerce/portone/adapter";
import { runReconciliation, settleIfProviderPaid } from "../../../src/lib/commerce/portone/admission";
import { closeReconciliationPool } from "../../../src/lib/commerce/portone/ledger-transaction";
import { flushDeferredPaymentRisk } from "../../../src/lib/commerce/portone/review";
import { MEMBERSHIP_RELEASE, type CommerceSnapshot } from "../../../src/lib/commerce/contracts";
import { capturePayloadTestLifecycle } from "../../support/payload-lifecycle";
import { payloadOnInit } from "./payload-on-init-fixture";
import { serverChosenIDsPlugin } from "../../../src/payload/server-chosen-ids";
import { MemberWallets } from "../../../src/payload/collections/member-wallets";
import { MemberWalletCatchUp } from "../../../src/payload/collections/member-wallet-catch-up";
import { walletCatchUpCursorIndex } from "../../../src/payload/collections/member-wallet-catch-up/cursor-index";
import { walletCatchUpJobs } from "../../../src/payload/tasks/member-wallet-catch-up";

// Fixed isolated target; neither DATABASE_URI nor application .env is consulted.
export const databaseURL = "postgres://postgres@127.0.0.1:55476/i0db_proof_r4";
/** Owned disposable loopback target; defaults keep the I0 durability proof unchanged. */
export type ProofTarget = { container: string; port: number; database: string; runLabel?: string };
const i0Target: ProofTarget = { container: "sphmrs-i0db-r4-20261113-eda62f07", port: 55476, database: "i0db_proof_r4" };
const targetURL = (target: ProofTarget) => `postgres://postgres@127.0.0.1:${target.port}/${target.database}`;
/** Mirrors the real users.membershipStatus select so settlement can grant membership. */
export const membershipStatus = { name: "membershipStatus", type: "select" as const, defaultValue: "applicant", required: true,
  options: ["applicant", "invited", "approved", "staff", "waitlist", "suspended"] };
export const providerConfig = { mode: "test" as const, origin: "http://127.0.0.1:55476", storeId: "fixture-store", channelKey: "fixture-channel",
  apiSecret: "unused-fixture-value", webhookSecret: "unused-fixture-value", localKpnTestCheckout: false };
type ProofOptions = {
  expectedAmount?: number;
  risk?: boolean;
  beforeConfirm?: (req: PayloadRequest) => Promise<void>;
  beforeEvidence?: (req: PayloadRequest, read: number) => Promise<void>;
  disputeOnSecondRead?: boolean;
  afterEffect?: (collection: string, req: PayloadRequest) => Promise<void>;
};
const effectHooks = new WeakMap<PayloadRequest, NonNullable<ProofOptions["afterEffect"]>>();

export function isolateTransport(t: TestContext, allowedPort = i0Target.port) {
  let blocked = 0;
  t.mock.method(globalThis, "fetch", async () => { blocked++; throw new Error("HTTP forbidden by isolated DB proof"); });
  const connect = Socket.prototype.connect;
  t.mock.method(Socket.prototype, "connect", function (this: Socket, ...args: Parameters<Socket["connect"]>) {
    const first: unknown = Array.isArray(args[0]) ? args[0][0] : args[0];
    const options = typeof first === "object" && first !== null ? first as Record<string, unknown> : null;
    const port = Number(options ? options.port : first);
    const host = options ? String(options.host ?? "localhost") : String(args[1]);
    if (options?.path || port !== allowedPort || host !== "127.0.0.1") {
      blocked++;
      throw new Error("Only the disposable loopback database is allowed");
    }
    return Reflect.apply(connect, this, args);
  });
  t.after(() => assert.equal(blocked, 0, "No external transport attempted"));
}

export async function openProofDatabase(push = true, continuations: ReadonlySet<Promise<unknown>> = new Set(), target: ProofTarget = i0Target,
  hooks: { jobs?: JobsConfig; checkpointWritten?: (req: PayloadRequest) => Promise<void>; query?: (text: string, params: unknown[]) => void;
    /** Stands in for the browser member authority (origin, session, active membership) so the cart guard's member branch runs. */
    cartAuthorizer?: (req: PayloadRequest) => Promise<string> } = {},
) {
  const databaseURL = targetURL(target);
  const sqlTrace: string[] = [];
  // Fail before schema creation unless Docker still identifies the owned disposable target.
  const inspected: unknown = JSON.parse(execFileSync("docker", ["inspect", target.container], { encoding: "utf8", maxBuffer: 65536 }));
  assert.ok(Array.isArray(inspected) && inspected.length === 1);
  const container = inspected[0] as { Name: string; State: { Running: boolean }; Config: { Env: string[]; Labels: Record<string, string> };
    HostConfig: { Memory: number; PortBindings: Record<string, { HostIp: string; HostPort: string }[]> };
    Mounts: { Name?: string; Destination: string }[] };
  assert.equal(container.Name, `/${target.container}`);
  assert.equal(container.State.Running, true);
  assert.equal(container.Config.Env.includes(`POSTGRES_DB=${target.database}`), true);
  assert.deepEqual(container.HostConfig.PortBindings, { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: String(target.port) }] });
  assert.equal(container.HostConfig.Memory, 384 * 1024 * 1024);
  if (target.runLabel) assert.equal(container.Config.Labels["sphmrs.database-proof.run"], target.runLabel);
  // The database proof runner names a per-run volume; a standalone run keeps the fixed name.
  const volume = process.env.SPHMRS_PROOF_VOLUME || `${target.container}-data`;
  assert.equal(container.Mounts.some((mount) => mount.Name === volume && mount.Destination === "/var/lib/postgresql/data"), true);
  const config = await buildConfig({
    secret: randomUUID(), telemetry: false, admin: { user: "admins", disable: true },
    onInit: payloadOnInit(),
    typescript: { autoGenerate: false },
    db: postgresAdapter({ pool: { connectionString: databaseURL, max: 6, connectionTimeoutMillis: 5000,
      options: "-c statement_timeout=15000 -c idle_in_transaction_session_timeout=15000" },
      idType: "uuid", push, migrationDir: "tests/commerce/core", allowIDOnCreate: true, // as src/payload.config.ts
      beforeSchemaInit: [walletCatchUpCursorIndex],
      logger: { logQuery: (query, params) => {
        hooks.query?.(query, params);
        const operation = query.trim().split(/\s+/, 1)[0].toLowerCase();
        if (["begin", "commit", "rollback"].includes(operation)) sqlTrace.push(operation);
      } } }),
    collections: [
      { slug: "admins", auth: true, fields: [] },
      { slug: "users", fields: [{ name: "email", type: "email" }, { name: "name", type: "text" },
        { name: "emailVerified", type: "checkbox", defaultValue: false }, membershipStatus] },
      { slug: "media", upload: { disableLocalStorage: true }, fields: [] }, MemberWallets, MemberWalletCatchUp,
    ],
    jobs: { ...walletCatchUpJobs, ...hooks.jobs, deleteJobOnComplete: false },
    globals: [CommercePublication], plugins: [commercePlugin, commerceDomainPlugin, (config) => ({ ...config,
      collections: config.collections?.map((collection): CollectionConfig => ({ ...collection, hooks: { ...collection.hooks,
        ...(collection.slug === "carts" && hooks.cartAuthorizer ? { beforeChange: [createSecureCart(hooks.cartAuthorizer)] } : {}),
        afterChange: [...(collection.hooks?.afterChange ?? []), async ({ doc, req }) => {
          if (collection.slug === "member-wallet-catch-up") await hooks.checkpointWritten?.(req);
          await effectHooks.get(req)?.(collection.slug, req);
          return doc;
        }],
      } })),
    }), serverChosenIDsPlugin],
  });
  const payload = await getPayload({ config, key: randomUUID() });
  const closePayload = capturePayloadTestLifecycle(payload, continuations);
  // Never acquire an observation/kill client from the faulted adapter pool.
  const control = new Pool({ connectionString: databaseURL, max: 1, connectionTimeoutMillis: 5000,
    options: "-c statement_timeout=15000 -c idle_in_transaction_session_timeout=15000" });
  control.on("error", () => { console.error("Isolated proof control storage is unavailable."); });
  const close = async () => {
    const failures: unknown[] = [];
    try { await closePayload(); }
    catch (error) { failures.push(error); }
    try { await closeReconciliationPool(payload); }
    catch (error) { failures.push(error); }
    try { await control.end(); }
    catch (error) { failures.push(error); }
    if (failures.length) throw new AggregateError(failures, "Isolated proof cleanup failed");
  };
  const adapter = payload.db as unknown as PostgresAdapter;
  const pool = adapter.pool as Pool;
  const identity = await pool.query("SELECT current_database() AS name, current_setting('server_version') AS version");
  assert.equal(identity.rows[0].name, target.database);
  return { payload, adapter, pool, control, close, sqlTrace, version: String(identity.rows[0].version) };
}

type FixtureTicketTarget = { chainID: 137 | 84532; lock: string; memberLock: string };

export async function seedAttempt(payload: Payload, startedAt?: string) {
  const fixture = await seedConfiguredAttempt(payload, startedAt);
  if (fixture.snapshot.version !== 1) throw new Error("Expected a legacy fixture snapshot");
  return { ...fixture, snapshot: fixture.snapshot };
}

export async function seedConfiguredAttempt(payload: Payload, startedAt?: string, ticketTarget?: FixtureTicketTarget) {
  const customerID = randomUUID(), eventID = randomUUID(), productID = randomUUID(), cartID = randomUUID(), transactionID = randomUUID();
  const now = startedAt ?? new Date().toISOString();
  const legacySnapshot: CommerceSnapshot = { version: 1, customerID, eventID, productID, releaseID: MEMBERSHIP_RELEASE, accountLimit: 1, cartID,
    quantity: 1, currency: "KRW", unitAmount: 10000, shippingAmount: 3000, totalAmount: 13000,
    orderName: "Isolated database fixture", productVersion: now, eventVersion: now,
    shippingAddress: { country: "KR", recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture only" } };
  const target = ticketTarget ? { chainID: ticketTarget.chainID, lock: ticketTarget.lock } : undefined;
  const snapshot = target ? { ...legacySnapshot, version: 3 as const, kind: "guest-ticket-v1" as const,
    releaseID: productID, accountLimit: 2, quantity: 2, shippingAmount: 0 as const, totalAmount: 20000, ticketTarget: target } : legacySnapshot;
  const rows = [
    { collection: "users", id: customerID, data: { email: `${customerID}@fixture.invalid`, name: "Fixture" } },
    { collection: "commerce-events", id: eventID, data: { name: "Fixture", publicationApproved: true, capacity: 10, transportCapacity: 10,
      reservedQuantity: 0, committedQuantity: 0, partIStartsAt: now, partIEndsAt: new Date(Date.now() + 3600000).toISOString(), claimCutoffAt: now,
      ...(ticketTarget ? { checkInAuthority: "unlock-events", unlockTicketConfiguration: {
        chainID: ticketTarget.chainID, memberLock: ticketTarget.memberLock, guestLock: ticketTarget.lock, guestProductID: productID,
      } } : {}) } },
    { collection: "products", id: productID, data: { title: "Fixture", description: "Never offered", _status: "published", publicationApproved: true,
      event: eventID, inventory: 10, reservedQuantity: 0, priceInKRWEnabled: true, priceInKRW: 10000, shippingFeeKRW: 3000, dispatchSchedule: "Fixture",
      saleStartsAt: new Date(Date.now() - 60000).toISOString(), saleEndsAt: new Date(Date.now() + 3600000).toISOString() } },
    { collection: "carts", id: cartID, data: { customer: customerID, currency: "KRW", subtotal: snapshot.unitAmount * snapshot.quantity, items: [{ id: randomUUID(), product: productID, quantity: snapshot.quantity }] } },
    { collection: "transactions", id: transactionID, data: { customer: customerID, cart: cartID, currency: "KRW", amount: snapshot.totalAmount, status: "pending",
      paymentMethod: "portone", items: [{ id: randomUUID(), product: productID, quantity: snapshot.quantity }], portone: { paymentID: transactionID.replaceAll("-", ""),
        prepareKey: commerceSnapshotHash(snapshot), snapshotHash: commerceSnapshotHash(snapshot), snapshot, storeID: providerConfig.storeId, channelKey: providerConfig.channelKey } } },
  ];
  // Only fixture preparation bypasses business hooks; settlement uses unmodified Local API/hooks.
  for (const row of rows) await payload.db.create({ collection: row.collection as CollectionSlug, customID: row.id, data: { ...row.data, createdAt: now, updatedAt: now } });
  const user = { id: customerID, email: `${customerID}@fixture.invalid`, collection: "users" } as TypedUser;
  const req = await createLocalReq({ user }, payload);
  await inPaymentTransaction(req, async () => {
    try {
      return await withCommerceWrite(req, () => reservePurchase({ req, attemptID: transactionID,
        customerID, productID, releaseID: snapshot.releaseID, accountLimit: snapshot.accountLimit, eventID,
        quantity: snapshot.quantity, snapshotHash: commerceSnapshotHash(snapshot), ...(target ? { ticketTarget: target } : {}) }));
    } catch (error) {
      // Preserve the bounded first error before native ownership handling replaces it.
      console.error("reservation first error:", error instanceof Error ? error.message : "non-Error");
      throw error;
    }
  });
  return { snapshot, user, customerID, eventID, productID, cartID, transactionID };
}

export type Attempt = Awaited<ReturnType<typeof seedAttempt>>;

const fixturePolicy = { effectiveDate: "2020-01-01", sections: [{ heading: "Test policy", paragraphs: ["Test fixture, not approved public policy."] }] };
/** Synthetic, never-approved publication facts so the real catalogue opens in the disposable database. */
export async function publishFixtureCatalogue(payload: Payload) {
  await payload.updateGlobal({ slug: "commerce-publication" as never, overrideAccess: true, data: { _status: "published", publicationApproved: true,
    physicalProductApproved: true, fulfillmentReady: true, addressRetentionApproved: true, shippingCountries: ["KR"],
    disclosure: { seller: { name: "Test seller", registrationNumber: "123-45-67890", representative: "Test", address: "Test address", phone: "02-1234-5678" },
      policies: { terms: fixturePolicy, privacy: fixturePolicy, refund: fixturePolicy } } } as never });
}

/**
 * Today's membership checkout through its real entry: catalogue rows are seeded,
 * then the adapter's own initiatePayment runs in its owned payment transaction.
 * Unlike seedAttempt, nothing about the transaction or reservation is hand-written.
 */
/**
 * Production shape: /payments/portone/initiate is a Payload REST endpoint, so its
 * req carries payloadAPI "REST" into the adapter. This drives the plugin's own
 * initiate handler inside the owned payment transaction, as secureEndpoint does.
 * Returns the parsed body, or throws with the status and a bounded message.
 */
export async function initiateThroughEndpoint(payload: Payload, user: TypedUser, body: Record<string, unknown>,
  afterPrepare?: (req: PayloadRequest) => Promise<void>, allowNativeEditions = false): Promise<unknown> {
  const req = await createLocalReq({ user }, payload);
  req.payloadAPI = "REST";
  req.data = { attemptID: randomUUID(), ...body };
  const entry = createRequire(import.meta.url).resolve("@payloadcms/plugin-ecommerce");
  const { initiatePaymentHandler } = await import(new URL("./endpoints/initiatePayment.js", pathToFileURL(entry)).href) as {
    initiatePaymentHandler: (args: Record<string, unknown>) => Endpoint["handler"];
  };
  const handler = initiatePaymentHandler({ paymentMethod: createPortOneAdapter({ config: providerConfig, allowNativeEditions }),
    currenciesConfig: { defaultCurrency: "KRW", supportedCurrencies: [{ code: "KRW", decimals: 0, label: "Won", symbol: "KRW" }] } });
  const response = await inPaymentEndpoint(req, async (owned) => {
    try {
      const response = await handler(owned);
      if (response.ok) await afterPrepare?.(owned);
      return response;
    }
    catch (error) {
      // inPaymentEndpoint reports a thrown handler as "outcome unknown"; keep the bounded first error.
      console.error("initiate handler threw:", error instanceof Error ? error.message.slice(0, 200) : "non-Error");
      throw error;
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`initiate answered ${response.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

/** Creates an available published release and an owned cart, with no attempt yet. */
export async function seedCheckoutCart(payload: Payload, owner?: Pick<Attempt, "user" | "customerID">) {
  const customerID = owner?.customerID ?? randomUUID();
  if (owner) assert.equal(String(owner.user.id), customerID);
  const eventID = randomUUID(), productID = randomUUID(), cartID = randomUUID(), mediaID = randomUUID();
  const now = new Date().toISOString();
  const rows = [
    ...(owner ? [] : [{ collection: "users", id: customerID, data: { email: `${customerID}@fixture.invalid`, name: "Fixture" } }]),
    { collection: "media", id: mediaID, data: { filename: `${mediaID}.png`, mimeType: "image/png" } },
    { collection: "commerce-events", id: eventID, data: { name: "Fixture", publicationApproved: true, capacity: 10, transportCapacity: 10,
      reservedQuantity: 0, committedQuantity: 0, partIStartsAt: now, partIEndsAt: new Date(Date.now() + 3600000).toISOString(), claimCutoffAt: now } },
    { collection: "products", id: productID, data: { title: "Fixture", description: "Never offered", _status: "published", publicationApproved: true,
      images: [{ id: randomUUID(), image: mediaID }], event: eventID, inventory: 10, reservedQuantity: 0, priceInKRWEnabled: true, priceInKRW: 10000,
      shippingFeeKRW: 3000, dispatchSchedule: "Fixture",
      saleStartsAt: new Date(Date.now() - 60000).toISOString(), saleEndsAt: new Date(Date.now() + 3600000).toISOString() } },
    { collection: "carts", id: cartID, data: { customer: customerID, currency: "KRW", subtotal: 10000, items: [{ id: randomUUID(), product: productID, quantity: 1 }] } },
  ];
  // Fixture preparation only; the checkout itself runs through the adapter and Payload's hooks.
  for (const row of rows) await payload.db.create({ collection: row.collection as CollectionSlug, customID: row.id, data: { ...row.data, createdAt: now, updatedAt: now } });
  await publishFixtureCatalogue(payload);
  const user = owner?.user ?? { id: customerID, email: `${customerID}@fixture.invalid`, collection: "users" } as TypedUser;
  const shippingAddress = { country: "KR" as const, recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture only" };
  return { user, customerID, eventID, productID, cartID, shippingAddress };
}

export async function initiateAttempt(payload: Payload): Promise<Attempt> {
  const { user, customerID, eventID, productID, cartID, shippingAddress } = await seedCheckoutCart(payload);
  const prepared = await initiateThroughEndpoint(payload, user, { cartID, shippingAddress }) as { transactionID: string; paymentID: string };
  const stored = await payload.findByID({ collection: "transactions" as CollectionSlug, id: prepared.transactionID, depth: 0, overrideAccess: true }) as unknown as {
    id: ReturnType<typeof randomUUID>; portone: { paymentID: string; snapshot: CommerceSnapshot } };
  assert.equal(stored.id, prepared.transactionID, "the transaction is stored under the id the adapter chose");
  assert.equal(stored.portone.paymentID, prepared.paymentID);
  return { snapshot: stored.portone.snapshot, user, customerID, eventID, productID, cartID, transactionID: stored.id };
}

export async function confirmation(payload: Payload, f: Pick<Attempt, "user" | "cartID" | "transactionID"> &
  Partial<Pick<Attempt, "snapshot">> & { customerID: string }, options: ProofOptions = {}) {
  const amount = options.expectedAmount ?? f.snapshot?.totalAmount;
  assert.ok(amount);
  const req = await createLocalReq({ user: f.user }, payload);
  // Production shape: /payments/portone/confirm-order is a Payload REST endpoint.
  req.payloadAPI = "REST";
  if (options.afterEffect) effectHooks.set(req, options.afterEffect);
  const input = { cartID: f.cartID, transactionID: f.transactionID, paymentID: f.transactionID.replaceAll("-", "") };
  req.data = input;
  let reads = 0;
  const deps = { config: providerConfig,
    getPayment: async () => {
      const read = ++reads;
      await options.beforeEvidence?.(req, read);
      return { id: input.paymentID, storeId: providerConfig.storeId, status: "PAID",
      channel: { key: providerConfig.channelKey, type: "TEST" }, customer: { id: f.customerID }, currency: "KRW",
      amount: { total: amount, paid: amount, cancelled: 0 },
      disputes: options.risk || options.disputeOnSecondRead && read === 2 ? [true] : [] };
    } };
  const entry = createRequire(import.meta.url).resolve("@payloadcms/plugin-ecommerce");
  const { confirmOrderHandler } = await import(new URL("./endpoints/confirmOrder.js", pathToFileURL(entry)).href) as {
    confirmOrderHandler: (args: Record<string, unknown>) => Endpoint["handler"];
  };
  const handler = confirmOrderHandler({ paymentMethod: createPortOneAdapter(deps),
    currenciesConfig: { defaultCurrency: "KRW", supportedCurrencies: [{ code: "KRW", decimals: 0, label: "Won", symbol: "KRW" }] } });
  const run = async () => {
    try {
      return await inPaymentEndpoint(req, async (owned) => {
        await options.beforeConfirm?.(owned);
        return handler(owned);
      });
    } finally {
      effectHooks.delete(req);
      await flushDeferredPaymentRisk(req);
    }
  };
  return {
    req, deps, run, reads: () => reads,
    runAdmitted: async () => {
      try {
        return await runReconciliation(req, input, "confirm",
          () => settleIfProviderPaid(req, input.paymentID, run, deps), deps, { boundedRecheck: true });
      } finally { effectHooks.delete(req); }
    },
  };
}

export async function nativeSession(req: PayloadRequest) {
  const adapter = req.payload.db as unknown as PostgresAdapter;
  const session = adapter.sessions[String(await req.transactionID)];
  assert.ok(session, "Owned native PostgreSQL session must exist");
  return session.db;
}

export async function nativeProgress(req: PayloadRequest, f: Attempt) {
  const session = await nativeSession(req);
  const result = await session.execute(sql`SELECT pg_backend_pid() AS pid,
    (SELECT count(*)::int FROM orders WHERE commerce_attempt_i_d=${f.transactionID}) AS orders,
    (SELECT inventory::int FROM products WHERE id=${f.productID}::uuid) AS stock,
    (SELECT paid_quantity::int FROM commerce_allowances WHERE customer_id=${f.customerID}::uuid) AS allowance,
    (SELECT count(*)::int FROM commerce_admissions WHERE transaction_id=${f.transactionID}::uuid) AS admissions`);
  return result.rows[0] as { pid: number; orders: number; stock: number; allowance: number; admissions: number };
}

export async function effects(pool: Pick<Pool, 'query'>, f: Attempt) {
  const { rows } = await pool.query(`SELECT
    (SELECT count(*)::int FROM orders WHERE commerce_attempt_i_d=$1::text) AS orders,
    (SELECT inventory::int FROM products WHERE id=$2::uuid) AS stock,
    (SELECT reserved_quantity::int FROM products WHERE id=$2::uuid) AS reserved,
    (SELECT paid_quantity::int FROM commerce_allowances WHERE customer_id=$3::uuid AND release_i_d=$4::text) AS allowance,
    (SELECT count(*)::int FROM commerce_admissions WHERE transaction_id=$1::uuid) AS admissions,
    (SELECT count(*)::int FROM orders WHERE commerce_attempt_i_d=$1::text AND fulfillment_status='pending') AS fulfillment,
    (SELECT status FROM transactions WHERE id=$1::uuid) AS status`, [f.transactionID, f.productID, f.customerID, MEMBERSHIP_RELEASE]);
  return rows[0] as Record<string, unknown>;
}
