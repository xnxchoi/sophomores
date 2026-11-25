import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import test from "node:test";

// P0, 25 Nov: Turbopack compiled ledger-transaction.ts's createRequire(createRequire(import.meta.url).resolve(...)) into
// createRequire(<module id>), which throws in the BUILT server only ("filename must be a file URL"); every
// reconciliation then answered 409. tsx-run tests cannot see it. Application code under src/ is bundled, so it uses
// static imports (Payload's adapter re-exports its own Drizzle at @payloadcms/db-postgres/drizzle/*). The built-output
// check is tests/commerce/portone/built-ledger/ (seed.mts + smoke.mjs against `next start` or standalone server.js).
test("bundled application code never calls createRequire", () => {
  const offenders = globSync("src/**/*.{ts,tsx,mts,js,mjs}")
    .filter(file => /\bcreateRequire\s*\(/.test(readFileSync(file, "utf8")));
  assert.deepEqual(offenders, []);
});
