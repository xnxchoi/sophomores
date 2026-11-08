import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { Pool } from "pg";
import * as configuration from "@/lib/member-auth/payload-config";
import { createPayloadMemberRuntime } from "@/lib/member-auth/payload-runtime";

const config: configuration.PayloadMemberConfig = Object.freeze({
  origin: "http://localhost:3000",
  databaseUrl: "postgres://fixture:synthetic@localhost:4141/sopho",
  secret: "a".repeat(64),
  verificationSecret: "b".repeat(64),
  emailDelivery: true,
  google: true
});
const keys = ["emailOtp", "google", "magicLink", "passkey"];

test("disabled configuration exposes only four false capability flags", () => {
  const flags = configuration.configuredMemberCapabilities(null);
  assert.deepEqual(flags, { emailOtp: false, magicLink: false, google: false, passkey: false });
  assert.deepEqual(Object.keys(flags).sort(), keys);
  assert.ok(Object.isFrozen(flags));
});

for (const emailDelivery of [false, true]) {
  for (const google of [false, true]) {
    test(`public projection matches canonical runtime with email=${emailDelivery}, google=${google}`, () => {
      const input = Object.freeze({ ...config, emailDelivery, google });
      const flags = configuration.configuredMemberCapabilities(input);
      // A supplied inert pool proves projection parity without a DB connection.
      const pool = new EventEmitter() as unknown as Pool;
      const runtime = createPayloadMemberRuntime(input, { pool, getSession: async () => null });
      assert.deepEqual(flags, { emailOtp: emailDelivery, magicLink: emailDelivery, google, passkey: true });
      assert.deepEqual(runtime.capabilities, flags);
      assert.deepEqual(Object.keys(flags).sort(), keys);
      assert.ok(Object.isFrozen(flags));
      assert.equal(input.secret, config.secret);
      assert.equal(input.verificationSecret, config.verificationSecret);
      assert.doesNotMatch(JSON.stringify(flags), /fixture|synthetic|localhost|databaseUrl|verificationSecret|secret/);
    });
  }
}

test("unlisted configuration fields cannot cross the public projection", () => {
  const input = Object.freeze({ ...config, extraCredential: "private-synthetic-token" });
  const flags = configuration.configuredMemberCapabilities(input);
  assert.deepEqual(Object.keys(flags).sort(), keys);
  assert.doesNotMatch(JSON.stringify(flags), /private|extraCredential|origin|databaseUrl/);
});
