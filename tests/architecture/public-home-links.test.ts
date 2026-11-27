import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
// A home link (Link or a) whose content, past comments and a FocusShape, starts with the logo.
const markInHomeLink = /<(?:Link|a)\b[^>]*href=["']\/["'][^>]*>\s*(?:\{\/\*[\s\S]*?\*\/\}\s*)*(?:<FocusShape[^>]*>\s*)?<BrandMark\b/;

for (const [file, rendersMark] of [
  ["src/components/tickets/ticket-selection.tsx", true],
  ["src/components/Authentication/member-auth/account-study.tsx", true],
  ["src/components/Authentication/phone-verification/phone-verification.tsx", true],
  ["src/components/shell/site-header.tsx", true],
  ["src/app/(auth)/logout/page.tsx", false],
] as const) {
  test(`${file} returns to the actual public home route, not the asset directory`, () => {
    const source = readFileSync(resolve(root, file), "utf8");
    assert.equal(/href=["']\/public["']/.test(source), false, "No /public application route exists");
    assert.equal(/href=["']\/["']/.test(source), true, "Keep the home navigation control");
    // The mark is the logo alone (owner, 27 Nov): the caller's home link wraps it.
    if (rendersMark) assert.equal(markInHomeLink.test(source), true, "The home link wraps the logo");
  });
}
