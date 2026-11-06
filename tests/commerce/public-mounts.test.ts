import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

for (const path of ["app/(site)/page.tsx", "app/(site)/tickets/page.tsx", "app/(site)/tickets/payment/page.tsx"]) {
  test(`source-only: ${path} mounts the same seller disclosure`, async () => {
    const source = await readFile(path, "utf8");
    assert.match(source, /import\s+\{\s*SellerDisclosure\s*\}/);
    assert.match(source, /<SellerDisclosure[\s/>]/);
  });
}

test("source-only: ticket entry keeps secrets server-side and requires published disclosures before checkout", async () => {
  const source = await readFile("app/(site)/tickets/page.tsx", "utf8");
  assert.match(source, /loadPortOneConfig/);
  assert.match(source, /loadPortOneCatalogue/);
  assert.match(source, /commerceDisclosure/);
  assert.match(source, /checkoutReady=/);
  assert.doesNotMatch(source, /JSON\.stringify\(.*(?:config|secret)/i);
});
