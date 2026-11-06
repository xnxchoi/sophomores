import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const databaseSuites = [
  "tests/payload/auth-integrity.test.ts",
  "tests/payload/homepage-fallbacks.test.ts",
  "tests/payload/staff-registration.test.ts",
];

function listSuites(args: string[]): string[] {
  const result = spawnSync(process.execPath, ["tests/run-unit.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as string[];
}

test("default discovery retains nested unit suites but excludes database/provider and runtime suites", () => {
  const files = listSuites(["--list"]);
  assert.ok(files.includes("tests/member-auth/member-auth-mail.test.ts"));
  assert.ok(files.includes("tests/payload/cms-email-login.test.ts"));
  assert.ok(files.includes("tests/tooling/unit-discovery.test.ts"));
  assert.equal(files.some((file) => file.startsWith("tests/runtime/")), false);
  for (const file of databaseSuites) assert.equal(files.includes(file), false, file);
  assert.equal(files.includes("tests/payload/portone-payment-safety.test.ts"), false,
    "Payment adapter writes require their separate explicit opt-in, never normal discovery");
  assert.equal(new Set(files).size, files.length);
  assert.deepEqual(files, [...files].sort());
});

test("database discovery selects only the explicitly opted-in database suites", () => {
  assert.deepEqual(listSuites(["--database", "--list"]), databaseSuites);
});

test("discovery flags are order independent", () => {
  assert.deepEqual(listSuites(["--list", "--database"]), databaseSuites);
});

test("unknown runner flags fail before running suites", () => {
  const result = spawnSync(process.execPath, ["tests/run-unit.mjs", "--list", "--databse"], {
    cwd: root,
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown test runner argument/);
});

test("database execution rejects an invalid target before starting a suite", () => {
  const result = spawnSync(process.execPath, ["tests/run-unit.mjs", "--database"], {
    cwd: root, encoding: "utf8", timeout: 10_000,
    env: { ...process.env, DATABASE_URI: "not-a-database-url" },
  });
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /A local PostgreSQL database is required/);
});
