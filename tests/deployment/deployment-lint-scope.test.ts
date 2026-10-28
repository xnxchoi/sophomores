import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { ESLint } from "eslint";

test("lint excludes reference bundles and deployment copies, not app or automation source", async () => {
  const root = resolve(import.meta.dirname, "../..");
  const eslint = new ESLint({ cwd: root });
  for (const file of ["artifacts/qa/reference.js", ".deployment/runs/example/source/app/page.tsx"]) {
    assert.equal(await eslint.isPathIgnored(resolve(root, file)), true, file);
  }
  for (const file of ["app/page.tsx", "scripts/deploy.ts"]) {
    assert.equal(await eslint.isPathIgnored(resolve(root, file)), false, file);
  }
});
