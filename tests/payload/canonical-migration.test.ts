import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { migrations } from "../../migrations";

test("canonical membership is registered in the existing Payload migration history", async () => {
  const migration = migrations.find((entry) => entry.name === "20261101_000000_canonical_members");
  assert.ok(migration);
  assert.equal(typeof migration.up, "function");
  assert.equal(typeof migration.down, "function");
  const source = await readFile(new URL("../../migrations/20261101_000000_canonical_members.ts", import.meta.url), "utf8");
  assert.ok(source.indexOf("CREATE SCHEMA IF NOT EXISTS phone_verification") < source.indexOf("CREATE SCHEMA IF NOT EXISTS canonical_member"));
  assert.match(source, /user_id uuid PRIMARY KEY REFERENCES public\.users\(id\)/);
  assert.doesNotMatch(source, /DROP SCHEMA.*member_auth|DELETE FROM.*member_auth/);
});
