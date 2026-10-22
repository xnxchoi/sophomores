import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const features = [
  ["intro-study", "entry-animation", "intro", "intro-study.tsx"],
  ["invitation-study", "invitation", "invitation", "experience.tsx"],
  ["ticket-study", "tickets", "tickets", "ticket-study.tsx"],
] as const;

test("reusable features are grouped by domain while existing preview routes remain stable", () => {
  for (const [previous, domain, route, component] of features) {
    assert.ok(fs.existsSync(path.join(root, "components", domain, component)));
    assert.ok(fs.existsSync(path.join(root, "lib", domain)));
    assert.equal(fs.existsSync(path.join(root, "components", previous)), false);
    assert.equal(fs.existsSync(path.join(root, "lib", previous)), false);
    const page = fs.readFileSync(path.join(root, "app/(site)/studies", route, "page.tsx"), "utf8");
    assert.ok(page.includes(`@/components/${domain}/`));
  }
});
