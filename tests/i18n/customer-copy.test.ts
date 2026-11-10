import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createTranslator } from "next-intl";
import en from "../../messages/en.json";

test("customer copy keeps CMS and interpolated values outside the catalogue", () => {
  const t = createTranslator({ locale: "en", messages: en, namespace: "Customer" });
  assert.equal(t("components_commerce_offer.admissionIncludesEvent", { event: "Part I" }), "One coin includes one admission to Part I.");
  assert.equal(t("components_commerce_order_admissions.admissionNumber", { unit: 2 }), "Admission 2");
  assert.equal(t("components_tickets_ticket_selection.testQuoteUpdated", { total: "₩10,000" }), "Test quote updated. Total ₩10,000. No reservation is made.");
  assert.equal(t("components_tickets_ticket_selection.ticketUnavailable", { label: "CMS release name" }), "CMS release name — unavailable");
  assert.equal(t("components_tickets_ticket_selection.ticket"), "Ticket");
  const offer = readFileSync("src/components/commerce/offer.tsx", "utf8");
  assert.match(offer, /\{offer\.title\}/);
  assert.match(offer, /\{section\.heading\}/);
  assert.match(offer, /\{paragraph\}/);
});

test("settings and menu data contain stable message keys, not local English catalogues", () => {
  assert.doesNotMatch(readFileSync("src/lib/settings/sections.ts", "utf8"), /Interface and display preferences\./);
  assert.doesNotMatch(readFileSync("src/lib/content/menu.ts", "utf8"), /label: "Reading"/);
});
