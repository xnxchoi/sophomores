import { spawnSync } from "node:child_process";
import { globSync } from "node:fs";

// Node 24's native glob keeps nested feature suites in discovery. Runtime auth
// acceptance stays an explicit post-build gate, not a skipped prebuild test.
const files = globSync(["tests/**/*.test.ts", "tests/**/*.test.tsx"], {
  exclude: ["tests/runtime/**"]
}).sort();
if (process.argv[2] === "--list") {
  console.log(JSON.stringify(files));
} else {
  if (files.length === 0) throw new Error("No prebuild tests discovered");
  const result = spawnSync(process.execPath, [
    "--import", "tsx", "--import", "./tests/support/css-modules.mjs",
    "--test", ...files
  ], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
