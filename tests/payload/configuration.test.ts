import assert from "node:assert/strict";
import { test } from "node:test";
import { payloadEnvironmentSchema } from "../../lib/payload/configuration";

const environment = { DATABASE_URI: "postgres://fixture@localhost:4141/sopho", PAYLOAD_SECRET: "a".repeat(64) };

test("Payload requires explicitly configured database and secret in every environment", () => {
  assert.ok(payloadEnvironmentSchema.safeParse(environment).success);
  for (const input of [{}, { ...environment, DATABASE_URI: undefined },
    { ...environment, PAYLOAD_SECRET: undefined }, { ...environment, PAYLOAD_SECRET: "short" },
    { ...environment, BETTER_AUTH_SECRET: "short" },
    { ...environment, DATABASE_URI: "https://localhost/sopho" }]) {
    assert.equal(payloadEnvironmentSchema.safeParse(input).success, false);
  }
});

test("Payload accepts PostgreSQL URI variants without rewriting the target", () => {
  const uri = "postgresql://fixture@localhost:4141/sopho";
  assert.equal(payloadEnvironmentSchema.parse({ ...environment, DATABASE_URI: uri }).DATABASE_URI, uri);
});
