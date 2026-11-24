import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { after, test } from "node:test";
import type { Endpoint, PayloadRequest } from "payload";
import {
  denyReviewCustomerOperation, isReviewCopyRequest, isReviewEditorProfile, isSandboxRuntime, reviewEditorOrigin,
} from "@/lib/auth/review-editor-policy";
import { payloadEnvironmentSchema } from "@/payload/configuration";
import { bootstrapSuperAdminEmail } from "@/payload/seed/super-admin";

// The explicit sandbox runtime on the preview host: customer operations run as on production
// against the PortOne test channel; unset, the preview host stays the review copy.
const origin = reviewEditorOrigin;
const webhookSecret = "whsec_" + randomBytes(32).toString("base64");
const portone = {
  PORTONE_PAYMENT_MODE: "test", PORTONE_ORIGIN: origin, PORTONE_STORE_ID: "store-sandbox-fixture",
  PORTONE_CHANNEL_KEY: "channel-sandbox-fixture", PORTONE_API_SECRET: "api-secret-fixture-value", PORTONE_WEBHOOK_SECRET: webhookSecret,
};
// The TEST store and channel, pinned separately from the configured pair.
const pins = { PORTONE_SANDBOX_TEST_STORE_ID: portone.PORTONE_STORE_ID, PORTONE_SANDBOX_TEST_CHANNEL_KEY: portone.PORTONE_CHANNEL_KEY };
const sandbox = { NEXT_PUBLIC_SERVER_URL: origin, PREVIEW_RUNTIME: "sandbox", ...portone, ...pins };
const keys = [...Object.keys(sandbox), "REVIEW_OWNER_EMAIL", "BETTER_AUTH_URL", "NEXT_PUBLIC_BETTER_AUTH_URL"];
const savedEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const setEnv = (env: Record<string, string>) => {
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, env);
};
after(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("only the exact sandbox flag, without a review owner, in PortOne test mode and on the pinned channel, opens the preview host", () => {
  assert.equal(isSandboxRuntime(sandbox), true);
  assert.equal(isReviewEditorProfile(origin, sandbox), false);
  for (const env of [
    { ...sandbox, PREVIEW_RUNTIME: "Sandbox" }, { ...sandbox, PREVIEW_RUNTIME: "1" }, { ...sandbox, PREVIEW_RUNTIME: "" },
    { ...sandbox, REVIEW_OWNER_EMAIL: "" }, { ...sandbox, REVIEW_OWNER_EMAIL: "owner@sophomores.co" },
    { ...sandbox, PORTONE_PAYMENT_MODE: "live" }, { ...sandbox, PORTONE_PAYMENT_MODE: "disabled" },
    { ...sandbox, PORTONE_PAYMENT_MODE: "unknown" }, { NEXT_PUBLIC_SERVER_URL: origin, ...portone },
    { ...sandbox, PORTONE_SANDBOX_TEST_STORE_ID: undefined }, { ...sandbox, PORTONE_SANDBOX_TEST_CHANNEL_KEY: "" },
    { ...sandbox, PORTONE_STORE_ID: "store-live-fixture" }, { ...sandbox, PORTONE_CHANNEL_KEY: "channel-live-fixture" },
  ]) {
    assert.equal(isSandboxRuntime(env), false, JSON.stringify(env));
    assert.equal(isReviewEditorProfile(origin, env), true);
  }
  // Unset, nothing changes: the review host and a review owner are both the review copy; production is not.
  assert.equal(isReviewEditorProfile("https://sophomores.co", {}), false);
  assert.equal(isReviewEditorProfile("https://sophomores.co", { REVIEW_OWNER_EMAIL: "x@sophomores.co" }), true);

  const hostRequest = new Request(origin + "/api/setlists/fixture");
  setEnv({ NEXT_PUBLIC_SERVER_URL: "http://localhost:3000" });
  assert.equal(isReviewCopyRequest(hostRequest), true, "a request to the review host is the review copy");
  assert.equal(denyReviewCustomerOperation(hostRequest)?.status, 403);
  setEnv({ NEXT_PUBLIC_SERVER_URL: "http://localhost:3000", PREVIEW_RUNTIME: "sandbox", ...portone, ...pins });
  assert.equal(isReviewCopyRequest(hostRequest), false);
  setEnv(sandbox);
  assert.equal(isReviewCopyRequest(hostRequest), false);
  assert.equal(denyReviewCustomerOperation(hostRequest), undefined);
  setEnv({ ...sandbox, PORTONE_PAYMENT_MODE: "live" });
  assert.equal(denyReviewCustomerOperation(hostRequest)?.status, 403, "live payments keep the review copy");
});

test("boot validation refuses a sandbox runtime that is not exact, has a review owner, is not PortOne test or is off the pinned channel", () => {
  const base = { DATABASE_URI: "postgres://fixture@localhost:4141/sopho", PAYLOAD_SECRET: "a".repeat(64) };
  assert.equal(payloadEnvironmentSchema.safeParse({ ...base, ...sandbox }).success, true);
  const issues = (changes: Record<string, string | undefined>) => {
    const result = payloadEnvironmentSchema.safeParse({ ...base, ...sandbox, ...changes });
    return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
  };
  assert.ok(issues({ PREVIEW_RUNTIME: "on" }).includes("PREVIEW_RUNTIME"));
  assert.ok(issues({ REVIEW_OWNER_EMAIL: "owner@sophomores.co" }).includes("REVIEW_OWNER_EMAIL"));
  assert.ok(issues({ REVIEW_OWNER_EMAIL: "" }).includes("REVIEW_OWNER_EMAIL"));
  assert.ok(issues({ PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: "owner@example.org" }).includes("PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL"));
  // Even past boot, the sandbox never reads the bootstrap address.
  assert.equal(bootstrapSuperAdminEmail({ ...sandbox, PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: "owner@example.org" }), null);
  assert.equal(bootstrapSuperAdminEmail({ PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: "owner@example.org" }), "owner@example.org");
  assert.ok(issues({ PORTONE_PAYMENT_MODE: "live" }).includes("PORTONE_PAYMENT_MODE"));
  assert.ok(issues({ PORTONE_PAYMENT_MODE: "disabled" }).includes("PORTONE_PAYMENT_MODE"));
  assert.ok(issues({ PORTONE_WEBHOOK_SECRET: undefined }).includes("PORTONE_PAYMENT_MODE"), "test config must be complete");
  for (const changes of [{ PORTONE_SANDBOX_TEST_STORE_ID: undefined }, { PORTONE_SANDBOX_TEST_CHANNEL_KEY: undefined },
    { PORTONE_STORE_ID: "store-live-fixture" }, { PORTONE_CHANNEL_KEY: "channel-live-fixture" }]) {
    assert.ok(issues(changes).includes("PORTONE_SANDBOX_TEST_CHANNEL_KEY"), JSON.stringify(changes));
  }
  // Unset, the review copy's own rule still refuses customer providers on the review host.
  assert.equal(payloadEnvironmentSchema.safeParse({ ...base, NEXT_PUBLIC_SERVER_URL: origin, ...portone }).success, false);
});

const reviewBody = { error: "Unavailable on the review copy." };
/** A Payload stand-in that records every use; a denied operation must never open it. */
function trackedPayload() {
  const used: string[] = [];
  const payload = new Proxy({}, { get(_target, key) {
    used.push(String(key));
    throw new Error("fixture: Payload reached");
  } });
  return { used, payload };
}
function signedWebhook(body: string, secret = webhookSecret) {
  const id = "msg_" + randomUUID();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64"))
    .update(`${id}.${timestamp}.${body}`).digest("base64");
  return new Request(origin + "/api/payments/portone/webhooks", { method: "POST", body, headers: {
    "content-type": "application/json", "webhook-id": id, "webhook-timestamp": timestamp, "webhook-signature": `v1,${signature}`,
  } });
}

test("through the registered endpoints: a signed webhook and the cart reach their handlers only in the sandbox runtime", async () => {
  setEnv(sandbox);
  const { commercePlugin } = await import("@/lib/commerce/ecommerce");
  const { commerceDomainPlugin } = await import("@/lib/commerce/domain");
  const { postgresAdapter } = await import("@payloadcms/db-postgres");
  const config = await commerceDomainPlugin(await commercePlugin({ collections: [], endpoints: [],
    secret: "synthetic", db: postgresAdapter({ pool: {} }) }));
  const webhook = config.endpoints?.find((endpoint) => endpoint.path === "/payments/portone/webhooks" && endpoint.method === "post");
  const cartEndpoints = config.collections?.find((collection) => collection.slug === "carts")?.endpoints;
  assert.ok(webhook && Array.isArray(cartEndpoints) && cartEndpoints.length > 0);

  const event = JSON.stringify({ type: "Transaction.Paid",
    data: { paymentId: randomUUID().replaceAll("-", ""), storeId: portone.PORTONE_STORE_ID } });
  const call = async (endpoint: Endpoint, request: Request) => {
    const tracked = trackedPayload();
    const req = Object.assign(request, { user: null, data: undefined, payload: tracked.payload }) as unknown as PayloadRequest;
    const response = await endpoint.handler(req);
    return { response, used: tracked.used };
  };

  // Review copy (flag unset): denied before any Payload use, with the private no-store header.
  setEnv({ NEXT_PUBLIC_SERVER_URL: origin, ...portone });
  const reviewed = await call(webhook, signedWebhook(event));
  assert.equal(reviewed.response.status, 403);
  assert.deepEqual(await reviewed.response.json(), reviewBody);
  assert.equal(reviewed.response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(reviewed.used, []);

  // Sandbox: the signature is verified and the handler goes on to read the payment's transaction.
  setEnv(sandbox);
  const delivered = await call(webhook, signedWebhook(event));
  assert.ok(delivered.used.length > 0, "the signed webhook reached the handler's Payload read");
  // A forged signature stops at verification in the sandbox too.
  const forged = await call(webhook, signedWebhook(event, "whsec_" + randomBytes(32).toString("base64")));
  assert.deepEqual(forged.used, []);
  assert.notEqual(forged.response.status, 200);

  for (const endpoint of cartEndpoints) {
    const cartRequest = () => new Request(origin + "/api/carts" + endpoint.path.replace(/:[A-Za-z]+/g, randomUUID()),
      { method: endpoint.method.toUpperCase(), headers: { "content-type": "application/json", origin },
        body: ["get", "head"].includes(endpoint.method) ? undefined : "{}" });
    setEnv({ NEXT_PUBLIC_SERVER_URL: origin, ...portone });
    const reviewCart = await call(endpoint, cartRequest());
    assert.equal(reviewCart.response.status, 403, endpoint.path);
    assert.deepEqual(await reviewCart.response.json(), reviewBody);
    setEnv(sandbox);
    const sandboxCart = await call(endpoint, cartRequest()).catch((error: unknown) => ({ error }));
    // Past the review gate, the cart's own member check answers (no signed-in member here).
    if ("response" in sandboxCart) {
      const body = await sandboxCart.response.clone().json().catch(() => null);
      assert.notDeepEqual(body, reviewBody, endpoint.path);
    }
  }
});

test("checkout initiation re-checks the pinned TEST channel in the sandbox runtime", async () => {
  const { adapterConfig, createPortOneAdapter } = await import("@/lib/commerce/portone/adapter");
  const pinned = { mode: "test" as const, origin, storeId: portone.PORTONE_STORE_ID, channelKey: portone.PORTONE_CHANNEL_KEY,
    apiSecret: portone.PORTONE_API_SECRET, webhookSecret, localKpnTestCheckout: false };
  setEnv(sandbox);
  assert.equal(adapterConfig({ config: pinned }).channelKey, pinned.channelKey);
  for (const config of [{ ...pinned, channelKey: "channel-live-fixture" }, { ...pinned, storeId: "store-live-fixture" },
    { ...pinned, mode: "live" as const }]) {
    assert.throws(() => adapterConfig({ config }), /Payment channel unavailable/);
    const tracked = trackedPayload();
    const req = { payload: tracked.payload, data: { attemptID: randomUUID() }, user: { id: "member-1", collection: "users" } };
    await assert.rejects(async () => createPortOneAdapter({ config }).initiatePayment({ data: {}, req, transactionsSlug: "transactions" } as never),
      /Payment channel unavailable/);
    assert.deepEqual(tracked.used, [], "refused before any Payload use");
  }
  // Outside the sandbox runtime (production), the configured channel is used as before.
  setEnv({ ...portone });
  assert.equal(adapterConfig({ config: { ...pinned, channelKey: "channel-live-fixture" } }).channelKey, "channel-live-fixture");
});
