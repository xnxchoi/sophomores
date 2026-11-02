import assert from "node:assert/strict";
import test from "node:test";
import { loadPayloadMemberConfig } from "../../lib/member-auth/payload-config";
import { createPayloadMemberRuntime } from "../../lib/member-auth/payload-runtime";
import { assertPayloadPhoneIdentifier, getPayloadMemberRuntime, isPayloadActiveMember, payloadPasskeyUser } from "../../lib/member-auth/payload-runtime";
import { Pool } from "pg";

const env = {
  MEMBER_AUTH_MODE: "local",
  MEMBER_AUTH_ORIGIN: "http://localhost:3000",
  DATABASE_URI: "postgres://fixture:synthetic@localhost:4141/sopho",
  BETTER_AUTH_SECRET: "a".repeat(64),
  PHONE_VERIFICATION_MODE: "local",
  PHONE_VERIFICATION_TRANSPORT: "fixture",
  PHONE_VERIFICATION_ORIGIN: "http://localhost:3000",
  PHONE_VERIFICATION_DATABASE_URL: "postgres://fixture:synthetic@localhost:4141/sopho",
  PHONE_VERIFICATION_STATE_SECRET: "b".repeat(64),
  PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET: "fixture-webhook-secret-0000000000000",
  PHONE_VERIFICATION_RECIPIENT: "fixture@example.test",
  PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: "100",
  PHONE_VERIFICATION_ZOHO_USER_ID: "101",
  PHONE_VERIFICATION_ZOHO_INTEGRATION_ID: "102",
};
const userId = "9e7947d3-2241-432b-a84b-21226aa40bfd";
const sessionId = "f6b138b3-912e-4b54-806d-36efb9eb907b";

test("canonical member config uses the existing explicit local database and rejects split authorities", () => {
  assert.equal(loadPayloadMemberConfig({}), null);
  assert.equal(loadPayloadMemberConfig(env)?.databaseUrl, env.DATABASE_URI);
  for (const change of [
    { DATABASE_URI: "postgres://fixture:synthetic@remote.invalid/sopho" },
    { PHONE_VERIFICATION_DATABASE_URL: "postgres://fixture:synthetic@localhost:4141/other" },
    { MEMBER_AUTH_ORIGIN: "https://public.invalid" },
    { BETTER_AUTH_SECRET: "short" },
    { BETTER_AUTH_SECRET: env.PHONE_VERIFICATION_STATE_SECRET },
  ]) assert.throws(() => loadPayloadMemberConfig({ ...env, ...change }));
});

test("canonical runtime consumes Payload sessions without creating another issuer", async () => {
  const config = loadPayloadMemberConfig(env)!;
  const createdAt = new Date(Date.now() - 1000);
  const expiresAt = new Date(Date.now() + 60_000);
  const request = new Request(`${config.origin}/api/member/status`);
  const runtime = createPayloadMemberRuntime(config, {
    getSession: async (input) => {
      assert.equal(input, request);
      return { user: { id: userId, emailVerified: true, email: "member@example.test", name: "Member" },
        session: { id: sessionId, createdAt, expiresAt } };
    },
  });
  try {
    assert.equal("auth" in runtime, false);
    assert.deepEqual(await runtime.toMemberPrincipal(request), {
      userId, sessionId, emailVerified: true, sessionCreatedAt: createdAt,
      email: "member@example.test", name: "Member",
    });
    assert.equal(runtime.capabilities.emailOtp, false);
  } finally { await runtime.pool.end(); }
});

test("canonical principal rejects retired IDs, expired sessions and invalid dates", async () => {
  const config = loadPayloadMemberConfig(env)!;
  for (const change of [
    { user: { id: "retired-member-id", emailVerified: true } },
    { session: { id: sessionId, createdAt: new Date(), expiresAt: new Date(0) } },
    { session: { id: "retired-session-id", createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000) } },
    { session: { id: sessionId, createdAt: "not-a-date", expiresAt: new Date(Date.now() + 60_000) } },
    { session: { id: sessionId, createdAt: new Date(Date.now() + 60_000), expiresAt: new Date(Date.now() + 120_000) } },
    { session: { id: sessionId, createdAt: new Date(), expiresAt: "not-a-date" } },
  ]) {
    const runtime = createPayloadMemberRuntime(config, { getSession: async () => ({
      user: { id: userId, emailVerified: true },
      session: { id: sessionId, createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000) },
      ...change,
    }) });
    try { assert.equal(await runtime.toMemberPrincipal(new Request(config.origin)), null); }
    finally { await runtime.pool.end(); }
  }
});

test("disabled local enrollment never bypasses an existing identifier constraint", async () => {
  const original = process.env.MEMBER_AUTH_MODE;
  process.env.MEMBER_AUTH_MODE = "disabled";
  try {
    assert.equal(getPayloadMemberRuntime(), null);
    await assertPayloadPhoneIdentifier(new Headers(), userId);
    await assert.rejects(assertPayloadPhoneIdentifier(new Headers({
      cookie: `sophomores-phone-identifier=${"a".repeat(43)}`,
    }), userId), { code: "UNAVAILABLE" });
    assert.equal(await isPayloadActiveMember(userId), false);
    assert.equal(await payloadPasskeyUser("credential"), null);
  } finally {
    if (original === undefined) delete process.env.MEMBER_AUTH_MODE;
    else process.env.MEMBER_AUTH_MODE = original;
  }
});

test("a missing canonical session stays unauthenticated and pool errors never log credentials", async (t) => {
  const pool = new Pool();
  const errorLog = t.mock.method(console, "error", () => undefined);
  const runtime = createPayloadMemberRuntime({ ...loadPayloadMemberConfig(env)!, emailDelivery: true, google: true }, {
    pool, getSession: async () => null,
  });
  try {
    assert.equal(await runtime.toMemberPrincipal(new Request(env.MEMBER_AUTH_ORIGIN)), null);
    assert.deepEqual(runtime.capabilities, { emailOtp: true, magicLink: true, google: true, passkey: true });
    pool.emit("error", new Error("postgres://private:never-log-this@localhost/db"));
    assert.deepEqual(errorLog.mock.calls[0].arguments, ["Canonical member storage is unavailable."]);
  } finally { await pool.end(); }
});
