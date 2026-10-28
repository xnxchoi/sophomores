import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "../..");

test("all studies are removed from app/(site) to prevent leaking into production builds", () => {
  assert.equal(fs.existsSync(path.join(root, "app/(site)/studies")), false);
  assert.ok(fs.existsSync(path.join(root, "app/(site)/page.tsx")));
  assert.ok(fs.existsSync(path.join(root, "app/(site)/account/page.tsx")));
  assert.ok(fs.existsSync(path.join(root, "app/(site)/account/continue/page.tsx")));
});
