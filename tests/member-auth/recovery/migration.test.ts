import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("recovery snapshot preserves all historical tables and enum definitions", () => {
  const previous = JSON.parse(
    readFileSync(
      "src/lib/migrations/20261101_081527_canonical_auth_schema.json",
      "utf8"
    )
  );
  const snapshot = JSON.parse(
    readFileSync("src/lib/migrations/20261102_000000_recovery_intake.json", "utf8")
  );
  assert.equal(snapshot.prevId, previous.id);
  assert.deepEqual(snapshot.enums, previous.enums);
  for (const [name, table] of Object.entries(previous.tables))
    if (name !== "public.payload_locked_documents_rels")
      assert.deepEqual(snapshot.tables[name], table, name);
  const locked = structuredClone(
    snapshot.tables["public.payload_locked_documents_rels"]
  );
  for (const section of ["columns", "indexes", "foreignKeys"])
    for (const name of Object.keys(locked[section]))
      if (name.includes("account_recovery_requests"))
        delete locked[section][name];
  assert.deepEqual(
    locked,
    previous.tables["public.payload_locked_documents_rels"]
  );
});
test("migration only mutates recovery storage and additive CMS lock relation", () => {
  const source = readFileSync(
    "src/lib/migrations/20261102_000000_recovery_intake.ts",
    "utf8"
  );
  assert.ok(
    !/(ALTER|UPDATE|DELETE FROM) (?:TABLE )?(?:public\.)?(?:users|accounts|sessions|phone_bindings)\b/i.test(
      source
    )
  );
  assert.match(source, /Recovery claims are immutable/);
  assert.match(
    source,
    /NEW\.review_log - \(jsonb_array_length\(NEW\.review_log\)-1\) IS DISTINCT FROM OLD\.review_log/
  );
  assert.match(
    source,
    /status IN \('submitted','needs_proof','rejected','closed'\)/
  );
});
