import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("release entrypoints select the explicit functional gate without changing default coverage", () => {
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(scripts.test, "node tests/run-unit.mjs");
  assert.equal(scripts["test:functional"], "node tests/run-unit.mjs --functional");
  assert.equal(scripts["test:styling"], "node tests/run-unit.mjs --styling");
  for (const [name, flag] of [["test:functional:guarded", "--functional"], ["test:styling:guarded", "--styling"]]) {
    assert.match(scripts[name], /scripts\/resource-guard\.py/);
    assert.ok(scripts[name].endsWith(`tests/run-unit.mjs ${flag}`));
  }
  assert.match(readFileSync("deployment/Dockerfile", "utf8"), /&& pnpm test:functional && pnpm exec next typegen && pnpm typecheck && pnpm build/);
});

test("functional and deferred-styling discovery explicitly partition the comprehensive suite", () => {
  const discover = (...flags: string[]) => {
    const result = spawnSync(process.execPath, ["tests/run-unit.mjs", "--list", ...flags], {
      encoding: "utf8", timeout: 5_000,
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout) as string[];
  };
  const all = discover();
  const functional = discover("--functional");
  const styling = discover("--styling");
  assert.deepEqual(styling, [
    "tests/styling/deferred-article-grid.test.tsx",
    "tests/styling/deferred-clock-delegation.test.ts",
  ]);
  assert.equal(functional.some((file) => styling.includes(file)), false);
  assert.deepEqual([...functional, ...styling].sort(), all);
  assert.equal(new Set(all).size, all.length);
  for (const file of [
    "tests/architecture/component-source-layout.test.ts",
    "tests/architecture/brand-mark.test.tsx",
    "tests/authentication/authentication-failures.test.tsx",
    "tests/member-auth/member-auth-ui-dom.test.tsx",
    "tests/commerce/portone/adapter.test.ts",
    "tests/reading/fixtures.test.tsx",
    "tests/motion/dom-loops.test.tsx",
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
