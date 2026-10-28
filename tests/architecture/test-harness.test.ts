import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("prebuild discovery retains nested tests but separates built-runtime security tests", () => {
  const result = spawnSync(process.execPath, ["tests/run-unit.mjs", "--list"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const files: string[] = JSON.parse(result.stdout);
  assert.ok(files.includes("tests/warp/tuning.test.ts"));
  assert.ok(files.includes("tests/flame-backdrop/config.test.ts"));
  assert.ok(files.includes("tests/preview/preview-session-auth.test.ts"));
  assert.ok(files.every(file => !file.startsWith("tests/runtime/")));
  assert.ok(files.every(file => /\.test\.tsx?$/.test(file)));
  assert.equal(files.length, new Set(files).size);
  const manifest = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.scripts["test:preview-runtime"], "node --import tsx --test tests/runtime/preview-auth.test.ts");
});

test("SSR-only loader handles CSS modules without claiming to render styles", () => {
  const result = spawnSync(process.execPath, [
    "--import", "./tests/support/css-modules.mjs", "--input-type=module", "-e",
    "import styles from './components/arc/copy-button/copy-button.module.css'; console.log(JSON.stringify(styles));"
  ], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "{}");
});
