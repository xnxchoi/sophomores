import assert from "node:assert/strict";
import { test } from "node:test";
import { loadPayloadMemberConfig } from "@/lib/member-auth/payload-config";
import { configurationVariables, loadPhoneVerificationConfig } from "@/lib/phone-verification/server/config";

// Synthetic local values only. The failure must name settings and never carry a value.
const origin = "http://localhost:3000";
const database = "postgresql://localhost:5432/sophomores_verification_fixture";
const verifierSettings = {
  PHONE_VERIFICATION_STATE_SECRET: "a".repeat(64),
  PHONE_VERIFICATION_RECIPIENT: "verify@example.invalid",
  PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: "12345",
  PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET: "w".repeat(40),
  PHONE_VERIFICATION_ZOHO_USER_ID: "23456",
  PHONE_VERIFICATION_ZOHO_INTEGRATION_ID: "34567"
};
const local = {
  MEMBER_AUTH_MODE: "local", MEMBER_AUTH_ORIGIN: origin, DATABASE_URI: database, PAYLOAD_SECRET: "p".repeat(48),
  PHONE_VERIFICATION_MODE: "local", PHONE_VERIFICATION_TRANSPORT: "fixture",
  PHONE_VERIFICATION_ORIGIN: origin, PHONE_VERIFICATION_DATABASE_URL: database, ...verifierSettings
};
const failure = (load: () => unknown) => {
  try { load(); } catch (error) { return error; }
  assert.fail("expected a configuration failure");
};

test("a complete local profile loads", () => {
  assert.equal(loadPayloadMemberConfig(local)?.origin, origin);
});

test("missing verifier settings are named, never valued, through the membership loader", () => {
  // The preview-profile gap seen on 22 Nov: none of the six verifier settings set.
  const gap: Record<string, string | undefined> = { ...local };
  for (const name of Object.keys(verifierSettings)) delete gap[name];
  for (const load of [() => loadPhoneVerificationConfig(gap), () => loadPayloadMemberConfig(gap)]) {
    const error = failure(load);
    assert.deepEqual(configurationVariables(error), Object.keys(verifierSettings));
    // Existing callers match the message and the plain Error name.
    assert.match(String(error), /^Error: (Invalid local phone verification configuration|Canonical membership requires matching private local database and verification settings\.)$/);
  }
  const zoho = failure(() => loadPayloadMemberConfig({ ...local, PHONE_VERIFICATION_ZOHO_USER_ID: "0" }));
  assert.deepEqual(configurationVariables(zoho), ["PHONE_VERIFICATION_ZOHO_USER_ID"]);
});

test("membership settings are named by the check that failed", () => {
  for (const [change, names] of [
    [{ MEMBER_AUTH_MODE: "other" }, ["MEMBER_AUTH_MODE"]],
    [{ PHONE_VERIFICATION_MODE: "disabled" }, ["PHONE_VERIFICATION_MODE"]],
    [{ MEMBER_AUTH_ORIGIN: "http://localhost:3001" }, ["MEMBER_AUTH_ORIGIN", "PHONE_VERIFICATION_ORIGIN"]],
    [{ PAYLOAD_SECRET: "short" }, ["PAYLOAD_SECRET"]],
    [{ BETTER_AUTH_SECRET: "short" }, ["BETTER_AUTH_SECRET"]],
    [{ PHONE_VERIFICATION_TRANSPORT: "other" }, ["PHONE_VERIFICATION_TRANSPORT"]]
  ] as const) {
    const error = failure(() => loadPayloadMemberConfig({ ...local, ...change }));
    assert.deepEqual(configurationVariables(error), names, JSON.stringify(Object.keys(change)));
    for (const value of Object.values(local)) assert.equal(JSON.stringify(configurationVariables(error)).includes(value), false);
  }
});

test("only this module's own errors report names", () => {
  // Review-A (member-status r1, LOW): an unrelated error shaped like ours reports nothing.
  assert.deepEqual(configurationVariables(Object.assign(new Error("x"), { variables: ["secret value"] })), []);
  assert.deepEqual(configurationVariables(Object.assign(new Error("x"), { variables: ["DATABASE_URI"] })), []);
  assert.deepEqual(configurationVariables(null), []);
});

test("a mail setting failure names the mail settings, not the earlier checks", () => {
  // Review-A (member-status r1, LOW): the SMTP loader runs after the origin and mode checks.
  const error = failure(() => loadPayloadMemberConfig({ ...local, MEMBER_AUTH_MAIL_MODE: "smtp" }));
  assert.deepEqual(configurationVariables(error), ["MEMBER_AUTH_MAIL_MODE", "MEMBER_AUTH_SMTP_HOST", "MEMBER_AUTH_SMTP_PORT",
    "MEMBER_AUTH_SMTP_USERNAME", "MEMBER_AUTH_SMTP_PASSWORD", "MEMBER_AUTH_SMTP_FROM"]);
});
