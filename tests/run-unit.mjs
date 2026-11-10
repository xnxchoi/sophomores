import { spawnSync } from "node:child_process";
import { existsSync, globSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Node 24's native glob keeps nested feature suites in discovery. Runtime auth
// acceptance stays an explicit post-build gate, not a skipped prebuild test.
// Database/provider suites require deliberate opt-in, even while the local
// development database is disposable. Reset permission is not delivery consent.
const args = process.argv.slice(2);
for (const arg of args) {
  if (!["--list", "--database", "--functional", "--styling"].includes(arg)) {
    throw new Error(`Unknown test runner argument: ${arg}`);
  }
}
if (["--database", "--functional", "--styling"].filter((flag) => args.includes(flag)).length > 1) {
  throw new Error("Select only one database, functional or deferred-styling suite");
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
