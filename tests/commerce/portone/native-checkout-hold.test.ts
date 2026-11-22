import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { APIError, type Endpoint, type PayloadRequest } from "payload";
import { secureCommerceEndpoint } from "@/lib/commerce/ecommerce";
import { nativePurchaseSnapshotSchema } from "@/lib/commerce/native-edition-receipt";
import { createPortOneAdapter } from "@/lib/commerce/portone/adapter";
import { createAdapterEndpoints } from "@/lib/commerce/portone/endpoints";
import { commerceSnapshotHash } from "@/lib/commerce/snapshot-hash";
import { nativeTransactionFixture } from "../core/native-transaction-fixture";
import { installEndpointLedger } from "./endpoint-ledger-fixture";

const transactionID = "915de316-e98d-4ca7-9d32-f5cb6785daf0";
const cartID = "915de316-e98d-4ca7-9d32-f5cb6785daf1";
const paymentID = transactionID.replaceAll("-", "");
const customerID = "buyer";
const config = { mode: "test" as const, origin: "http://localhost:3000", storeId: "test-store",
  channelKey: "test-channel", apiSecret: "synthetic", webhookSecret: "synthetic", localKpnTestCheckout: true };
const shippingAddress = { country: "KR" as const, recipientName: "Fixture", phone: "01012345678",
  postalCode: "12345", addressLine1: "Fixture" };
const item = { product: "book", variant: "sku", quantity: 1 };
const authorize = async (req: PayloadRequest) => String(req.user?.id);
const path = "/payments/portone/initiate";

function browserRequest(native: Awaited<ReturnType<typeof nativeTransactionFixture>>, path: string,
  body: Record<string, unknown>, buyer = customerID): PayloadRequest {
  return Object.assign(new Request(config.origin + "/api" + path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }), { payload: native.req.payload, user: { collection: "users", id: buyer, email: "buyer@example.invalid" }, context: {} }) as PayloadRequest;
}

for (const mode of ["held", "unrelated", "rollback-unknown"] as const) {
  test(`installed initiate handler: ${mode} under the owned payment transaction`, async (t) => {
    const native = await nativeTransactionFixture(mode === "rollback-unknown"
      ? { rollbackError: new Error("synthetic rollback failure") } : {});
    t.after(native.cleanup);
    const cartReads: number[] = [];
    const writeAttempts: string[] = [];
    const failWrite = async () => { writeAttempts.push("write"); throw new Error("Unexpected write"); };
    Object.assign(native.req.payload, {
      findByID: async ({ collection, depth, overrideAccess }: { collection: string; depth: number; overrideAccess: boolean }) => {
        assert.equal(collection, "carts");
        assert.equal(overrideAccess, false);
        cartReads.push(depth);
        if (depth === 0) {
          assert.ok(native.queries.filter(({ text }) => text.includes("pg_advisory_xact_lock")).length >= 2);
          if (mode === "unrelated") throw new APIError("Variants unavailable", 409);
        }
        return { id: cartID, customer: customerID, currency: "KRW", items: [item] };
      },
      find: async ({ collection }: { collection: string }) => {
        assert.equal(collection, "transactions");
        return { docs: [] };
      },
      create: failWrite, update: failWrite, delete: failWrite,
    });
    const entry = createRequire(import.meta.url).resolve("@payloadcms/plugin-ecommerce");
    const { initiatePaymentHandler } = await import(new URL("./endpoints/initiatePayment.js", pathToFileURL(entry)).href) as {
      initiatePaymentHandler: (args: Record<string, unknown>) => Endpoint["handler"];
    };
    const official = initiatePaymentHandler({ paymentMethod: createPortOneAdapter({ config }),
      currenciesConfig: { defaultCurrency: "KRW", supportedCurrencies: [{ code: "KRW", decimals: 0, label: "Won", symbol: "KRW" }] } });
    const pluginStatuses: number[] = [];
    const endpoint = secureCommerceEndpoint({ path, method: "post", handler: async (req) => {
      const response = await official(req);
      pluginStatuses.push(response.status);
      return response;
    } }, authorize);
    const response = await endpoint.handler(browserRequest(native, path, { cartID, attemptID: transactionID, shippingAddress }));
    assert.deepEqual(cartReads, [2, 0], "the plugin reads first, then our adapter reloads the cart");
    assert.deepEqual(pluginStatuses, [500], "the installed handler masks the adapter refusal");
    assert.deepEqual(writeAttempts, []);
    assert.equal(native.events.includes("commit"), false);
    assert.equal(native.events.at(-1), "rollback");
    assert.ok(native.events.every((event) => ["begin", "select", "rollback"].includes(event)));
    assert.ok(native.queries.filter(({ text }) => text.includes("pg_advisory_xact_lock")).length >= 2);
    assert.equal(response.status, mode === "held" ? 409 : mode === "unrelated" ? 500 : 503);
    if (mode !== "unrelated") assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal("paymentRequest" in await response.json(), false);
  });
}

test("a valid held v2 resume is status-only; foreign and mismatched attempts cannot read it", async (t) => {
  const native = await nativeTransactionFixture();
  t.after(native.cleanup);
  const snapshot = nativePurchaseSnapshotSchema.parse({
    version: 2, kind: "native-edition-v1", customerID, cartID, productID: item.product,
    releaseID: "book", eventID: null, productVersion: "1", variantID: item.variant,
    variantVersion: "1", optionID: "option", variantTypeID: "type", editionLabel: "Book",
    editionKind: "book-only", editionRuleVersion: 1, maximumQuantity: 1,
    editionEntitlements: { membershipSignet: false, freeLaunchTicket: false },
    termsRevision: "1", disclosureRevision: "1", fulfillmentRevision: "1", benefitRevision: "1",
    quantity: 1, currency: "KRW", unitAmount: 35000, shippingAmount: 0, totalAmount: 35000, orderName: "Book", shippingAddress,
  });
  const snapshotHash = commerceSnapshotHash(snapshot);
  const row = { id: transactionID, status: "pending", customer: customerID, cart: cartID,
    amount: 35000, currency: "KRW", paymentMethod: "portone", items: [item],
    portone: { paymentID, snapshot, snapshotHash, prepareKey: "a".repeat(64),
      storeID: config.storeId, channelKey: config.channelKey } };
  let attemptReads = 0;
  let writes = 0;
  let providerCalls = 0;
  const failWrite = async () => { writes++; throw new Error("Unexpected business write"); };
  Object.assign(native.req.payload, {
    findByID: async ({ collection, id }: { collection: string; id: string }) => {
      assert.equal(collection, "transactions");
      assert.equal(id, transactionID);
      attemptReads++;
      return structuredClone(row);
    },
    find: async ({ collection }: { collection: string }) => {
      const docs = collection === "commerce-reservations" ? [{ attemptID: transactionID, snapshotHash,
        customer: customerID, product: item.product, releaseID: snapshot.releaseID,
        quantity: 1, event: null, state: "reserved" }] : [];
      return { docs, totalDocs: docs.length };
    },
    create: failWrite, update: failWrite, delete: failWrite,
  });
  installEndpointLedger(native.req);
  const resume = createAdapterEndpoints({ config, getPayment: async () => {
    providerCalls++;
    return { type: "PAYMENT_NOT_FOUND" };
  } }, authorize).find((endpoint) => endpoint.path === "/resume")!;
  const resumePath = "/payments/portone/resume";
  const endpoint = secureCommerceEndpoint({ ...resume, path: resumePath }, authorize);
  const input = { transactionID, paymentID, cartID };

  const foreign = await endpoint.handler(browserRequest(native, resumePath, input, "someone-else"));
  assert.equal(foreign.status, 404);
  assert.deepEqual(await foreign.json(), { outcome: "unavailable" });
  const mismatched = await endpoint.handler(browserRequest(native, resumePath, { ...input, transactionID: cartID }));
  assert.equal(mismatched.status, 409);
  assert.equal("paymentRequest" in await mismatched.json(), false);
  assert.equal(attemptReads, 2);

  const own = await endpoint.handler(browserRequest(native, resumePath, input));
  assert.equal(own.status, 200);
  assert.deepEqual(await own.json(), { message: "Payment status only", outcome: "status-only", transactionID, paymentID, status: "pending" });
  assert.equal(own.headers.get("cache-control"), "private, no-store");
  assert.ok(attemptReads > 2);
  assert.equal(providerCalls, 0);
  assert.equal(writes, 0);
});
