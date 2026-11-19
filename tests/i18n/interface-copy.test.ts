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

test("site guide: a visible opener, one settled announcement, and close keeps the step", () => {
  const t = createTranslator({ locale: "en", messages: en, namespace: "Interface" });
  assert.equal(t("tour.step", { current: 2, total: 3, label: "Music", description: "Browse." }), "Step 2 of 3: Music. Browse.");
  assert.doesNotMatch(t("tour.help.description"), /reach us|contact/i);
  const store = readFileSync("src/stores/Tour/TourStore.ts", "utf8");
  assert.match(store, /closeInterfaceTour: \(\) => set\(\{ ifActive: false \}\)/);
  assert.match(store, /openInterfaceTour: \(\) => set\(\{ ifActive: true, ifIndex: 0 \}\)/);
  const tour = readFileSync("src/components/UX/Tour/InterfaceTour.tsx", "utf8");
  assert.equal((tour.match(/aria-live=/g) ?? []).length, 1);
  assert.match(tour, /aria-hidden=\{present \? undefined : true\}/);
  assert.match(tour, /export function InterfaceTourOpener/);
  // The guide opens on the `?` key, as in The Hideaway; Help no longer carries an opener.
  assert.match(readFileSync("src/components/UX/Tour/index.tsx", "utf8"), /<InterfaceTourTrigger \/>/);
});

test("residual UI preserves notification and seller content values", () => {
  const notifications = readFileSync("src/components/notifications/notification-list.tsx", "utf8");
  assert.match(notifications, /\{notification.title\}/);
  assert.match(notifications, /\{notification.body\}/);
  assert.match(notifications, /t\("empty"\)/);
  const seller = readFileSync("src/app/(site)/_commerce/seller-disclosure.tsx", "utf8");
  for (const field of ["name", "registrationNumber", "representative", "address", "phone", "mailOrderRegistrationNumber"]) assert.ok(seller.includes(`{seller.${field}}`));
  assert.doesNotMatch(seller, /lang="ko"/);
});
