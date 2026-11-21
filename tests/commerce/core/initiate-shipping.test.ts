import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPayloadMemberRuntime } from "@/lib/member-auth/payload-runtime";
import test from "node:test";
import { postgresAdapter } from "@payloadcms/db-postgres";
import type { PayloadRequest } from "payload";

test("physical checkout rejects missing shipping before handing work to the official handler", async t => {
  const origin = "http://localhost:3000";
  const user = { id: randomUUID(), collection: "users" };
  const database = "postgresql://127.0.0.1:55401/sophomores_verification_fixture";
  const profile = {
    MEMBER_AUTH_MODE: "local", MEMBER_AUTH_ORIGIN: origin, DATABASE_URI: database,
    BETTER_AUTH_SECRET: "fixture-better-auth-secret-not-for-use",
    PHONE_VERIFICATION_MODE: "local", PHONE_VERIFICATION_ORIGIN: origin,
    PHONE_VERIFICATION_DATABASE_URL: database, PHONE_VERIFICATION_TRANSPORT: "fixture",
    PHONE_VERIFICATION_STATE_SECRET: "b".repeat(64),
    PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET: "fixture-webhook-secret-not-for-use",
    PHONE_VERIFICATION_RECIPIENT: "fixture@example.invalid",
    PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: "1", PHONE_VERIFICATION_ZOHO_USER_ID: "2",
    PHONE_VERIFICATION_ZOHO_INTEGRATION_ID: "3",
  };
  const previous = Object.fromEntries(Object.keys(profile).map(key => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  Object.assign(process.env, profile);
  const runtime = getPayloadMemberRuntime();
  assert.ok(runtime);
  t.after(() => runtime.pool.end());
  t.mock.method(runtime.pool, "connect", async () => { throw new Error("No database connection in unit proof"); });
  t.mock.method(runtime, "toMemberPrincipal", async () => ({
    userId: user.id, sessionId: randomUUID(), email: "fixture@example.invalid", emailVerified: true,
    sessionCreatedAt: new Date(),
  }));
  t.mock.method(runtime.repository, "isActiveMember", async (id: string) => id === user.id);
  const { commercePlugin } = await import("@/lib/commerce/ecommerce");
  const config = await commercePlugin({ collections: [], endpoints: [], secret: randomUUID(), db: postgresAdapter({ pool: {} }) });
  const endpoint = config.endpoints?.find(({ path }) => path === "/payments/portone/initiate");
  assert.ok(endpoint);
  const input = { cartID: randomUUID(), attemptID: randomUUID() };
  const request = (data: object) => Object.assign(new Request(origin + "/api/payments/portone/initiate", {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(data),
  }), { user, payload: { db: {}, logger: { error() {} } } }) as unknown as PayloadRequest;

  const invalid = request(input);
  assert.equal((await endpoint.handler(invalid)).status, 400);
  assert.equal(invalid.data, undefined);

  const valid = request({ ...input, shippingAddress: {
    country: "KR", recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture",
  } });
  // A deliberately inert adapter fails after admission; no payment can start.
  assert.equal((await endpoint.handler(valid)).status, 503);
  assert.equal(valid.data?.cartID, input.cartID);
});
