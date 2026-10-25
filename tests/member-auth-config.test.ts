import assert from "node:assert/strict";
import { test } from "node:test";
import { loadMemberAuthConfig } from "../lib/member-auth/config";

const env = {
  MEMBER_AUTH_MODE: "local",
  MEMBER_AUTH_ORIGIN: "http://localhost:3240",
  MEMBER_AUTH_DATABASE_URL: "postgres://fixture:private@127.0.0.1:5432/sophomores_verification_test_auth",
  MEMBER_AUTH_SECRET: "b".repeat(64),
  PHONE_VERIFICATION_MODE: "local",
  PHONE_VERIFICATION_TRANSPORT: "zoho-poll",
  PHONE_VERIFICATION_ORIGIN: "http://localhost:3240",
  PHONE_VERIFICATION_DATABASE_URL: "postgres://fixture:private@127.0.0.1:5432/sophomores_verification_test_auth",
  PHONE_VERIFICATION_STATE_SECRET: "a".repeat(64),
  PHONE_VERIFICATION_RECIPIENT: "verify@sophomores.co",
  PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: "12345"
};

test("member auth is disabled by default and never parses unused credentials", () => {
  assert.equal(loadMemberAuthConfig({}), null);
  assert.equal(loadMemberAuthConfig({ MEMBER_AUTH_MODE: "disabled", MEMBER_AUTH_SECRET: "bad" }), null);
});

test("malformed environment containers reject with the same private error", () => {
  for (const value of [null, [], "local", 123])
    assert.throws(() => loadMemberAuthConfig(value as never), /^Error: Member authentication needs a valid private local configuration\.$/);
});

test("member auth permits only the explicit same-database localhost pilot", () => {
  const config = loadMemberAuthConfig(env)!;
  assert.equal(config.mode, "local");
  assert.equal(config.origin, "http://localhost:3240");
  assert.equal(config.rpId, "localhost");
  assert.equal(config.verificationSecret, env.PHONE_VERIFICATION_STATE_SECRET);
  assert.equal(config.databaseUrl, env.MEMBER_AUTH_DATABASE_URL);
  assert.equal(config.google, null);
  assert.equal(config.mail, null);
  assert.equal(Object.isFrozen(config), true);
});

test("public origins, mismatched verifier origins/databases, shared or weak secrets fail closed", () => {
  for (const change of [
    { MEMBER_AUTH_MODE: "production" },
    { MEMBER_AUTH_ORIGIN: "https://sophomores.co" },
    { MEMBER_AUTH_ORIGIN: "http://127.0.0.1:3240" },
    { MEMBER_AUTH_ORIGIN: "http://localhost:3240/path" },
    { MEMBER_AUTH_ORIGIN: "http://localhost:3240?key=secret" },
    { MEMBER_AUTH_ORIGIN: "http://user:pass@localhost:3240" },
    { MEMBER_AUTH_ORIGIN: "http://localhost:3240#fragment" },
    { PHONE_VERIFICATION_ORIGIN: "http://localhost:3217" },
    { PHONE_VERIFICATION_MODE: "disabled" },
    { MEMBER_AUTH_DATABASE_URL: "postgres://localhost/sophomores_verification_other" },
    { MEMBER_AUTH_DATABASE_URL: "postgres://remote.example/sophomores_verification_test" },
    { MEMBER_AUTH_SECRET: "short" },
    { MEMBER_AUTH_SECRET: env.PHONE_VERIFICATION_STATE_SECRET },
    { MEMBER_AUTH_SECRET: "REPLACE_THIS_SECRET" }
  ]) {
    assert.throws(() => loadMemberAuthConfig({ ...env, ...change }), /^Error: Member authentication needs a valid private local configuration\.$/);
  }
});

test("Google is optional, requires a valid complete pair, and never exposes secrets in errors", () => {
  const config = loadMemberAuthConfig({ ...env,
    MEMBER_AUTH_GOOGLE_CLIENT_ID: "123-fixture.apps.googleusercontent.com",
    MEMBER_AUTH_GOOGLE_CLIENT_SECRET: "private-google-client-secret"
  })!;
  assert.equal(config.google?.clientId, "123-fixture.apps.googleusercontent.com");
  assert.equal(Object.isFrozen(config.google), true);
  for (const change of [
    { MEMBER_AUTH_GOOGLE_CLIENT_ID: "123-fixture.apps.googleusercontent.com" },
    { MEMBER_AUTH_GOOGLE_CLIENT_SECRET: "private-google-client-secret" },
    { MEMBER_AUTH_GOOGLE_CLIENT_ID: "not-google.example", MEMBER_AUTH_GOOGLE_CLIENT_SECRET: "private-google-client-secret" },
    { MEMBER_AUTH_GOOGLE_CLIENT_ID: "123-fixture.apps.googleusercontent.com", MEMBER_AUTH_GOOGLE_CLIENT_SECRET: "bad secret" }
  ]) assert.throws(() => loadMemberAuthConfig({ ...env, ...change }), (error: unknown) => error instanceof Error && !error.message.includes("private-google"));
});
