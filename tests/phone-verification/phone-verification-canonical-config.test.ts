import assert from "node:assert/strict";
import { test } from "node:test";
import { loadPhoneVerificationConfig } from "../../lib/phone-verification/server/config";

const local = {
  PHONE_VERIFICATION_MODE: "local",
  PHONE_VERIFICATION_TRANSPORT: "zoho-poll",
  PHONE_VERIFICATION_ORIGIN: "http://localhost:3000",
  PHONE_VERIFICATION_DATABASE_URL: "postgres://fixture@localhost:4141/sopho",
  PHONE_VERIFICATION_STATE_SECRET: "a".repeat(64),
  PHONE_VERIFICATION_RECIPIENT: "verify@example.invalid",
  PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: "123",
  MEMBER_AUTH_MODE: "local",
  DATABASE_URI: "postgres://fixture@localhost:4141/sopho",
};

test("canonical local verification accepts the explicitly shared existing development database", () => {
  assert.equal(loadPhoneVerificationConfig(local)?.databaseUrl, local.DATABASE_URI);
});

test("existing-database opt-in requires canonical local mode and an identical connection", () => {
  for (const change of [
    { MEMBER_AUTH_MODE: "disabled" },
    { DATABASE_URI: "postgres://fixture@localhost:4141/other" },
    { DATABASE_URI: "postgres://different@localhost:4141/sopho" },
    { DATABASE_URI: undefined },
  ]) assert.throws(() => loadPhoneVerificationConfig({ ...local, ...change }));
});

test("canonical database opt-in never permits remote databases or invalid protocols", () => {
  for (const uri of ["postgres://fixture@remote.invalid:4141/sopho", "https://localhost/sopho"]) {
    assert.throws(() => loadPhoneVerificationConfig({ ...local, DATABASE_URI: uri, PHONE_VERIFICATION_DATABASE_URL: uri }));
  }
});

test("legacy dedicated verification database remains compatible without canonical opt-in", () => {
  assert.ok(loadPhoneVerificationConfig({ ...local, MEMBER_AUTH_MODE: undefined, DATABASE_URI: undefined,
    PHONE_VERIFICATION_DATABASE_URL: "postgres://fixture@localhost:4141/sophomores_verification_test" }));
});
