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

test("tour presets retain target protocols and use display-time translation keys", () => {
  const store = readFileSync("src/stores/Tour/TourStore.ts", "utf8");
  for (const id of ["side-drawer", "controlbar", "side-notch"]) assert.ok(store.includes(`id: "${id}"`));
  assert.doesNotMatch(store, /Quick access to navigation and your music player/);
  const tour = readFileSync("src/components/UX/Tour/InterfaceTour.tsx", "utf8");
  assert.match(tour, /t\(target.label\)/);
  assert.match(tour, /t\(target.description\)/);
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
