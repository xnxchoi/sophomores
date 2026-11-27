import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import reconciliationEvidence, { requireReconciliationEvidence, requiredSubtests, suite } from "../support/reconciliation-proof-evidence.mjs";

const file = "/disposable/tests/commerce/portone/reconciliation.db.test.ts";
const pass = (name, nesting, extra = {}) => ({ type: "test:pass", data: { name, nesting, file, ...extra } });
const summary = (overrides = {}) => ({ type: "test:summary", data: {
  success: true,
  counts: { topLevel: 1, passed: 17, tests: 17, skipped: 0, cancelled: 0, todo: 0, ...overrides },
} });
const evidence = async (events) => {
  let raw = "";
  for await (const chunk of reconciliationEvidence(events)) raw += chunk;
  return raw;
};

test("accepts only the named parent and all required passing I2 children", async () => {
  const raw = await evidence([...requiredSubtests.map((name) => pass(name, 1)), pass(suite, 0), summary()]);
  assert.equal(requireReconciliationEvidence(raw, file), 17);
});

test("rejects missing, unreadable, skipped and substituted suite evidence", async () => {
  const children = requiredSubtests.map((name) => pass(name, 1));
  for (const raw of [
    "",
    "unreadable",
    await evidence([pass(suite, 0, { skip: true }), summary({ skipped: 1, passed: 0, tests: 1 })]),
    await evidence([...children, pass("Another suite", 0), summary()]),
    await evidence([...children.slice(1), pass("Another subtest", 1), pass(suite, 0), summary()]),
    await evidence([...children.slice(1), pass(requiredSubtests[0], 1, { skip: "not run" }), pass(suite, 0), summary()]),
    await evidence([...children, pass(suite, 0, { file: "/different/suite.ts" }), summary()]),
    await evidence([...children, pass(suite, 0)]),
  ]) assert.throws(() => requireReconciliationEvidence(raw, file));
});

test("the actual Node CLI records passing evidence and rejects an all-skipped exit 0", () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "sphmrs-i2-smoke-")));
  const reporter = fileURLToPath(new URL("../support/reconciliation-proof-evidence.mjs", import.meta.url));
  const fixture = join(dir, "synthetic-i2.test.mjs");
  const receipt = join(dir, "results.json");
  try {
    for (const skip of [false, true]) {
      writeFileSync(fixture, `
        import test from "node:test";
        test(${JSON.stringify(suite)}, { skip: ${skip} }, async (t) => {
          for (const name of ${JSON.stringify(requiredSubtests)}) await t.test(name, () => {});
        });
      `);
      const run = spawnSync(process.execPath, ["--test", "--test-concurrency=1",
        "--test-reporter=spec", "--test-reporter-destination=stdout",
        `--test-reporter=${reporter}`, `--test-reporter-destination=${receipt}`, fixture],
      {
        encoding: "utf8", timeout: 15_000,
        // This is a new CLI run, not a child managed by the outer Node test runner.
        env: { ...process.env, NODE_TEST_CONTEXT: undefined, NODE_TEST_WORKER_ID: undefined },
      });
      assert.ifError(run.error);
      assert.equal(run.status, 0, run.stderr);
      const raw = readFileSync(receipt, "utf8");
      if (skip) assert.throws(() => requireReconciliationEvidence(raw, fixture));
      else assert.equal(requireReconciliationEvidence(raw, fixture), requiredSubtests.length + 1);
      rmSync(receipt);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
