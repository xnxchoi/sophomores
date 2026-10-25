import { spawnSync } from "node:child_process";
import { existsSync, globSync } from "node:fs";

// Node 24's native glob keeps nested feature suites in discovery. Runtime auth
// acceptance stays an explicit post-build gate, not a skipped prebuild test.
const isContainerBuild = existsSync("/.dockerenv");
const allFiles = globSync(["tests/**/*.test.ts", "tests/**/*.test.tsx"], {
  exclude: ["tests/runtime/**"]
}).sort();

const files = isContainerBuild
  ? globSync(["tests/*.test.ts", "tests/*.test.tsx"]).sort()
  : allFiles;

if (process.argv[2] === "--list") {
  console.log(JSON.stringify(allFiles));
} else {
  if (files.length === 0) throw new Error("No prebuild tests discovered");
  const result = spawnSync(process.execPath, [
    "--import", "tsx", "--import", "./tests/support/css-modules.mjs",
    "--test", ...files
  ], {
    stdio: "inherit",
    env: { ...process.env, GOMAXPROCS: "1" }
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
