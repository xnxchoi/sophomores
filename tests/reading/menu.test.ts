import { createTranslator } from "next-intl";
import messages from "../../messages/en.json";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { menuLinks } from "@/lib/content/menu";

// The mode toggle is covered with the theme store in tests/theme/page-and-global-theme.test.tsx.

test("the menu links carry their previews", () => {
  assert.equal(menuLinks[0]?.href, "/essays");
  assert.equal(menuLinks[1]?.href, "/");
  assert.equal(menuLinks[0]?.preview?.src, "/assets/credits/fixture-author.svg");
  const t = createTranslator({ locale: "en", messages, namespace: "Customer.navigation" });
  const previewKey = "index" as const;
  assert.equal(menuLinks[1]?.preview?.alt, previewKey);
  assert.equal(t(previewKey), "Index");
  const gradient = readFileSync(new URL("../../src/components/shell/menu-gradient.tsx", import.meta.url), "utf8");
  assert.match(gradient, /useCanvasClaim\(true\)/);
  assert.match(gradient, /seamless\.png/);
  assert.match(gradient, /data-theme/);
});
