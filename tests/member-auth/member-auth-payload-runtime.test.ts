import assert from "node:assert/strict";
import test from "node:test";
import { loadPayloadMemberConfig } from "@/lib/member-auth/payload-config";
import { loadMemberAuthConfig } from "@/lib/member-auth/config";
import { createPayloadMemberRuntime } from "@/lib/member-auth/payload-runtime";
import { assertPayloadPhoneIdentifier, getPayloadMemberRuntime, isPayloadActiveMember, payloadPasskeyUser } from "@/lib/member-auth/payload-runtime";
import { Pool } from "pg";
import { assertOwnedPreviewSocketAdmission, loadPhoneVerificationConfig, productionDatabaseUrl } from "@/lib/phone-verification/server/config";

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

test("a production-built local preview admits the owned socket only with explicit launcher admission", () => {
  const uri = "postgresql://preview_owner@localhost/sphmrs_owner_preview?host=%2Ftmp%2Fsphmrs-owner-preview-6lse30ag%2Fsocket&port=55439";
  const preview = {
    ...env,
    NODE_ENV: "production",
    MEMBER_AUTH_LOCAL_PREVIEW: "owned-socket",
    NEXT_PUBLIC_SERVER_URL: "http://localhost:3000",
    DATABASE_URI: uri,
    PHONE_VERIFICATION_DATABASE_URL: uri
  };
  assert.throws(() => assertOwnedPreviewSocketAdmission(preview), /requires explicit launcher admission/);
  assert.throws(() => loadPayloadMemberConfig(preview));
  assert.throws(() => loadPhoneVerificationConfig(preview));
  const admitted = { ...preview, SPHMRS_LOCAL_PREVIEW_SOCKET_ADMITTED: "1" };
  assert.equal(assertOwnedPreviewSocketAdmission(admitted), true);
  assert.equal(loadPayloadMemberConfig(admitted)?.databaseUrl, uri);
  assert.equal(loadPhoneVerificationConfig(admitted)?.databaseUrl, uri);
  assert.equal(loadPayloadMemberConfig(admitted)?.emailDelivery, false);
  assert.equal(assertOwnedPreviewSocketAdmission({ DATABASE_URI: "postgres://app@localhost/other?host=%2Ftmp%2Fother" }), false);
  for (const mode of [undefined, "disabled"]) {
    const staleAdmission = { ...admitted, MEMBER_AUTH_MODE: mode };
    assert.throws(() => loadMemberAuthConfig(staleAdmission), /requires the exact local fixture database profile/);
    assert.throws(() => loadPayloadMemberConfig(staleAdmission), /requires the exact local fixture database profile/);
  }
  for (const change of [
    { SPHMRS_LOCAL_PREVIEW_SOCKET_ADMITTED: "0" },
    { NEXT_PUBLIC_SERVER_URL: undefined },
    { PHONE_VERIFICATION_TRANSPORT: "zoho-poll" },
    { DATABASE_URI: env.DATABASE_URI },
    { PHONE_VERIFICATION_ORIGIN: "http://127.0.0.1:3000", MEMBER_AUTH_ORIGIN: "http://127.0.0.1:3000" },
    ...[
      uri.replace("localhost", "remote.invalid"),
      uri.replace("55439", "55440"),
      uri.replace("preview_owner@", "other@"),
      uri.replace("preview_owner@", "preview_owner:password@"),
      uri.replace("sphmrs_owner_preview?", "other?"),
      uri.replace("6lse30ag", "other"),
      uri + "&sslmode=require",
      uri + "&port=55439",
      uri + "&host=%2Ftmp",
      uri + "#other",
    ].map((value) => ({ DATABASE_URI: value, PHONE_VERIFICATION_DATABASE_URL: value }))
  ]) {
    assert.throws(() => loadPayloadMemberConfig({ ...admitted, ...change }));
    assert.throws(() => loadPhoneVerificationConfig({ ...admitted, ...change }));
  }
  const publicOrigin = "https://sophomores.co";
  for (const key of ["MEMBER_AUTH_ORIGIN", "PHONE_VERIFICATION_ORIGIN", "NEXT_PUBLIC_SERVER_URL",
    "BETTER_AUTH_URL", "NEXT_PUBLIC_BETTER_AUTH_URL"]) {
    const wrongOrigin = { ...admitted, [key]: publicOrigin };
    assert.throws(() => assertOwnedPreviewSocketAdmission(wrongOrigin), /^Error: Owned preview socket admission requires only http:\/\/localhost:3000 origins\.$/);
    assert.throws(() => loadPayloadMemberConfig(wrongOrigin));
    assert.throws(() => loadPhoneVerificationConfig(wrongOrigin));
  }
  const production = {
    ...admitted,
    MEMBER_AUTH_MODE: "production",
    PHONE_VERIFICATION_MODE: "production",
    MEMBER_AUTH_ORIGIN: "https://sophomores.co",
    PHONE_VERIFICATION_ORIGIN: "https://sophomores.co",
    NEXT_PUBLIC_SERVER_URL: "https://sophomores.co",
  };
  assert.equal(productionDatabaseUrl(uri), null);
  assert.throws(() => loadPayloadMemberConfig(production));
  assert.throws(() => loadPhoneVerificationConfig(production));
});

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
