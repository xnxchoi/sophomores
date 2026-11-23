import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createTranslator } from "next-intl";
import en from "../../../messages/en.json";

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
  // The header inbox (control bar view) is the one notification list; the /essays copy of it came out (owner, 24 Nov).
  const notifications = readFileSync("src/components/shell/controlbar/views.tsx", "utf8");
  assert.match(notifications, /\{item.title\}/);
  assert.match(notifications, /\{item.body\}/);
  assert.match(notifications, /list\("empty"\)/);
  const seller = readFileSync("src/app/(site)/_commerce/seller-disclosure.tsx", "utf8");
  // The fields render from one list of [field, value] pairs; each value is the seller's own data, not catalogue copy.
  for (const field of ["name", "registrationNumber", "representative", "address", "phone", "mailOrderRegistrationNumber"]) assert.ok(seller.includes(`seller.${field}`), field);
  assert.doesNotMatch(seller, /lang="ko"/);
});
