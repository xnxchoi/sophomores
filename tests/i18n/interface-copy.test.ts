import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createTranslator } from "next-intl";
import en from "../../messages/en.json";

test("interface counter and clipboard preserve interpolated content", () => {
  const t = createTranslator({ locale: "en", messages: en, namespace: "Interface" });
  assert.equal(t("radio.counter", { elapsed: "01:23", remaining: "02:34" }), "01:23 elapsed, 02:34 remaining");
  assert.equal(t("copy.successAnnouncement", { label: "Account URL" }), "Account URL: Copied");
  assert.equal(t("copy.errorAnnouncement", { label: "Account URL" }), "Account URL: Could not copy");
});

test("tour presets point to implemented routes and use display-time translation keys", () => {
  const store = readFileSync("src/stores/Tour/TourStore.ts", "utf8");
  for (const route of ["/essays", "/music", "/help"]) {
    assert.ok(store.includes(`href: "${route}"`));
    assert.doesNotThrow(() => readFileSync(`src/app/(site)${route}/page.tsx`, "utf8"));
  }
  assert.doesNotMatch(store, /Quick access to navigation and your music player/);
  const tour = readFileSync("src/components/UX/Tour/InterfaceTour.tsx", "utf8");
  assert.match(tour, /t\(target.label\)/);
  assert.match(tour, /t\(target.description\)/);
  assert.match(tour, /href=\{target.href\}/);
});
