import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import type { Payload } from "payload";
import { runHomePageSeed } from "../../scripts/seed-homepage-copies";

// Does the operator script finish? It must close Payload and report an exit code on every path.
function fake(existing: number, { failFind = false } = {}) {
  const calls: string[] = [];
  const payload = {
    find: async () => {
      if (failFind) throw new Error("synthetic");
      return { totalDocs: existing, docs: Array.from({ length: existing }, (_, i) => ({ id: `copy-${i}` })) };
    },
    delete: async () => { calls.push("delete"); },
    destroy: async () => { calls.push("destroy"); },
  } as unknown as Payload;
  return { payload, calls };
}
const quiet = () => {};

test("existing copies: reports them, closes Payload and exits 0", async () => {
  const { payload, calls } = fake(2);
  const lines: string[] = [];
  assert.equal(await runHomePageSeed({ getPayload: async () => payload, force: false, log: (line) => lines.push(line) }), 0);
  assert.match(lines[0], /Found 2 existing home-page copies/);
  assert.deepEqual(calls, ["destroy"]);
});

test("a failure closes Payload and exits 1", async () => {
  const { payload, calls } = fake(0, { failFind: true });
  const error = console.error;
  console.error = quiet;
  try {
    assert.equal(await runHomePageSeed({ getPayload: async () => payload, force: false, log: quiet }), 1);
  } finally {
    console.error = error;
  }
  assert.deepEqual(calls, ["destroy"]);
});

test("Payload failing to start still exits 1", async () => {
  const error = console.error;
  console.error = quiet;
  try {
    assert.equal(await runHomePageSeed({ getPayload: async () => { throw new Error("no database"); }, force: false, log: quiet }), 1);
  } finally {
    console.error = error;
  }
});

test("run as a script, the process ends on its own", () => {
  // An unreachable database: the script must report a failure and exit, not hang on open handles.
  const run = spawnSync(process.execPath, ["--import", "tsx", "scripts/seed-homepage-copies.ts"], {
    encoding: "utf8",
    timeout: 60_000,
    env: { ...process.env, DATABASE_URI: "postgres://seed:seed@127.0.0.1:1/none", PAYLOAD_SECRET: "0123456789abcdef0123456789abcdef", DISABLE_PAYLOAD_HMR: "true" },
  });
  assert.equal(run.signal, null, "it exited instead of being killed by the timeout");
  assert.notEqual(run.status, 0);
});
