import { spawnSync } from "node:child_process";
import { existsSync, globSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Node 24's native glob keeps nested feature suites in discovery. Runtime auth
// acceptance stays an explicit post-build gate, not a skipped prebuild test.
// Database/provider suites require deliberate opt-in, even while the local
// development database is disposable. Reset permission is not delivery consent.
const args = process.argv.slice(2);
for (const arg of args) {
  if (!["--list", "--database", "--functional", "--styling", "--tooling"].includes(arg)) {
    throw new Error(`Unknown test runner argument: ${arg}`);
  }
}
if (["--database", "--functional", "--styling", "--tooling"].filter((flag) => args.includes(flag)).length > 1) {
  throw new Error("Select only one database, functional, deferred-styling or tooling suite");
}
// Deployment-script (.mjs) and Python tooling suites are an explicit gate of
// their own: they exercise shell/Python tools, not the application bundle.
if (args.includes("--tooling")) {
  const node = globSync(["tests/**/*.test.mjs"]).sort();
  const python = globSync(["tests/**/test_*.py", "tests/**/*.test.py"]).sort();
  if (args.includes("--list")) {
    console.log(JSON.stringify([...node, ...python]));
    process.exit(0);
  }
  if (node.length === 0 || python.length === 0) throw new Error("No tooling suites discovered");
  let failed = false;
  const nodeRun = spawnSync(process.execPath, ["--test", "--test-concurrency=1", ...node], { stdio: "inherit", env: { ...process.env, GOMAXPROCS: "1" } });
  if (nodeRun.error) throw nodeRun.error;
  failed ||= nodeRun.status !== 0;
  for (const file of python) {
    const run = spawnSync("python3", ["-I", file], { stdio: "inherit" });
    if (run.error) throw run.error;
    failed ||= run.status !== 0;
  }
  process.exit(failed ? 1 : 0);
}
// Only these owner-deferred CSS checks are nonblocking. Default discovery still
// includes them; architecture, accessibility, motion behavior and security stay
// in the functional gate. Never derive this list from whichever tests failed.
const deferredStylingSuites = [
  "tests/styling/deferred-article-grid.test.tsx",
  "tests/styling/deferred-clock-delegation.test.ts",
];
for (const file of deferredStylingSuites) {
  if (!existsSync(file)) throw new Error(`Missing deferred styling suite: ${file}`);
}
const databaseSuites = [
  "tests/payload/auth-integrity.test.ts",
  "tests/payload/homepage-fallbacks.test.ts",
  "tests/payload/staff-registration.test.ts"
];
const discovered = globSync(
  args.includes("--database") ? databaseSuites : ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  { exclude: ["tests/runtime/**", "tests/payload/portone-payment-safety.test.ts", ...(args.includes("--database") ? [] : databaseSuites)] }
).sort();
const files = args.includes("--styling")
  ? discovered.filter((file) => deferredStylingSuites.includes(file))
  : args.includes("--functional")
    ? discovered.filter((file) => !deferredStylingSuites.includes(file))
    : discovered;

if (args.includes("--list")) {
  console.log(JSON.stringify(files));
} else {
  if (args.includes("--functional")) console.error(
    `Functional gate excludes ${deferredStylingSuites.length} explicitly owner-deferred CSS suites. Run tests/run-unit.mjs --styling separately; its failures are not waived or visual acceptance.`,
  );
  if (args.includes("--styling")) console.error("Deferred styling report only; not the functional release gate.");
  if (files.length === 0) throw new Error("No prebuild tests discovered");
  if (args.includes("--database")) {
    const { default: nextEnvironment } = await import("@next/env");
    nextEnvironment.loadEnvConfig(process.cwd());
    let database;
    try { database = new URL(process.env.DATABASE_URI ?? ""); } catch { /* Rejected below without printing credentials. */ }
    if (!database || !["postgres:", "postgresql:"].includes(database.protocol)
      || !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)) {
      throw new Error("A local PostgreSQL database is required for database tests.");
    }
    process.env.PAYLOAD_DATABASE_TESTS = "1";
  }
  // Serialize workers and preserve the supervisor's inherited heap cap. Local
  // agents must use test:guarded; V8 alone does not bound aggregate memory.
  const result = spawnSync(process.execPath, [
    "--import", "tsx", "--import", "./tests/support/css-modules.mjs",
    "--test", "--test-concurrency=1", ...files
  ], {
    stdio: "inherit",
    env: {
      ...process.env,
      GOMAXPROCS: "1",
      TSX_TSCONFIG_PATH: fileURLToPath(new URL("./tsconfig.json", import.meta.url)),
      ...(args.includes("--database") ? { DISABLE_PAYLOAD_HMR: "true" } : {})
    }
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
