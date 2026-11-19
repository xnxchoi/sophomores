import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// F6/F7: one additive block of layout and surface roles; lane pages use the roles, not the literals they replace.
const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const lane = [
  "src/app/(site)/_long-form/editorial-page.tsx",
  "src/app/(site)/_long-form/long-form.tsx",
  "src/app/(site)/_commerce/seller-contact.tsx",
  "src/app/(site)/help/shipping/page.tsx",
  "src/app/(site)/_commerce/policy-page.tsx",
  "src/app/(site)/team/team-credits.tsx",
];

test("lane pages use the roles instead of the literals they replace", () => {
  for (const path of lane) {
    const source = read(path);
    for (const literal of ["scroll-mt-28", "lg:top-28", "max-w-7xl", "backdrop-blur-md", "rounded-2xl"]) {
      assert.equal(source.includes(literal), false, `${path} still has ${literal}`);
    }
  }
  // /team is the Hideaway credits page as it was there (owner, 19 Nov), so only the editorial frame is held
  // to the gutter role.
  assert.match(read("src/app/(site)/_long-form/editorial-page.tsx"), /<main className="min-h-\[70svh\] px-gutter /, "the editorial frame uses the gutter");
});
