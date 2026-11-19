import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("release entrypoints select the functional gate; the UI quality tier is opt-in", () => {
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(scripts.test, "node tests/run-unit.mjs");
  assert.equal(scripts["test:functional"], "node tests/run-unit.mjs --functional");
  assert.equal(scripts["test:quality"], "node tests/run-unit.mjs --quality");
  for (const [name, flag] of [["test:functional:guarded", "--functional"], ["test:quality:guarded", "--quality"]]) {
    assert.match(scripts[name], /scripts\/resource-guard\.py/);
    assert.ok(scripts[name].endsWith(`tests/run-unit.mjs ${flag}`));
  }
  assert.match(readFileSync("deployment/Dockerfile", "utf8"), /&& pnpm test:functional && pnpm exec next typegen && pnpm typecheck && pnpm build/);
});

test("the default run excludes tests/quality, and --quality runs only it", () => {
  const discover = (...flags: string[]) => {
    const result = spawnSync(process.execPath, ["tests/run-unit.mjs", "--list", ...flags], {
      encoding: "utf8", timeout: 5_000,
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout) as string[];
  };
  const all = discover();
  const functional = discover("--functional");
  const quality = discover("--quality");
  assert.deepEqual(functional, all);
  assert.ok(quality.length > 0);
  assert.ok(quality.every((file) => file.startsWith("tests/quality/")));
  assert.equal(all.some((file) => file.startsWith("tests/quality/")), false);
  assert.deepEqual(discover("--styling"), quality, "--styling is the old name of the quality tier");
  for (const file of [
    "tests/authentication/authentication-failures.test.tsx",
    "tests/member-auth/member-auth-ui-dom.test.tsx",
    "tests/commerce/portone/adapter.test.ts",
  ]) assert.ok(functional.includes(file), `${file} remains blocking`);
});

test("ambiguous release gate selection fails before any suite or database action", () => {
  for (const flags of [["--functional", "--styling"], ["--functional", "--database"], ["--styling", "--database"]]) {
    const result = spawnSync(process.execPath, ["tests/run-unit.mjs", "--list", ...flags], {
      encoding: "utf8", timeout: 5_000,
    });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  }
});
