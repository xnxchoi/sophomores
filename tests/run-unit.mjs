import { spawnSync } from "node:child_process";
import { globSync } from "node:fs";

// Node 24's native glob keeps nested feature suites in discovery. Runtime auth
// acceptance stays an explicit post-build gate, not a skipped prebuild test.
// Database/provider suites require deliberate opt-in, even while the local
// development database is disposable. Reset permission is not delivery consent.
const args = process.argv.slice(2);
for (const arg of args) {
  if (arg !== "--list" && arg !== "--database") {
    throw new Error(`Unknown test runner argument: ${arg}`);
  }
}
const databaseSuites = [
  "tests/payload/auth-integrity.test.ts",
  "tests/payload/homepage-fallbacks.test.ts",
  "tests/payload/staff-registration.test.ts"
];
const files = globSync(
  args.includes("--database") ? databaseSuites : ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  { exclude: ["tests/runtime/**", ...(args.includes("--database") ? [] : databaseSuites)] }
).sort();

if (args.includes("--list")) {
  console.log(JSON.stringify(files));
} else {
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
  const result = spawnSync(process.execPath, [
    "--import", "tsx", "--import", "./tests/support/css-modules.mjs",
    "--test", "--test-concurrency=2", ...files
  ], {
    stdio: "inherit",
    env: { ...process.env, GOMAXPROCS: "1", ...(args.includes("--database") ? { DISABLE_PAYLOAD_HMR: "true" } : {}) }
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
