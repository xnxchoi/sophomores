import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");

for (const file of [
  "src/components/tickets/ticket-selection.tsx",
  "src/components/Authentication/member-auth/account-study.tsx",
  "src/components/Authentication/phone-verification/phone-verification.tsx",
  "src/components/shell/site-header.tsx",
  "src/app/(auth)/logout/page.tsx",
]) {
  test(`${file} returns to the actual public home route, not the asset directory`, () => {
    const source = readFileSync(resolve(root, file), "utf8");
    assert.equal(/href=["']\/public["']/.test(source), false, "No /public application route exists");
    assert.equal(/href=["']\/["']/.test(source), true, "Keep the home navigation control");
  });
}
