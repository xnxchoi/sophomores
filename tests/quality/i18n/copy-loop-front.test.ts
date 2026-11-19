import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createTranslator } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";

// Reviewed, source-grounded pass03 candidate contracts, not owner-approved
// wording or a runtime copy source. Korean and unresolved policy stay untouched.
const candidateCopy = {
  "Customer.components_commerce_offer.delivery": "Delivery fee",
  "Customer.components_shell_header_panels.searchForAnything": "Search articles…",
  "Customer.app_site_me_settings_account_page_client.handleRenamingWillBeAvailableCloserToTheEvent": "Your handle can’t be changed here.",
  "Customer.app_site_me_settings_security_page_client.currentDevice": "Unidentified device",
  "Customer.policy.backToTickets": "Back to shop"
} as const;

for (const [key, expected] of Object.entries(candidateCopy)) {
  test(`front copy pass03 retains its reviewed source-grounded candidate: ${key}`, () => {
    const t = createTranslator({
      locale: "en", messages: messagesByLocale.en,
      onError: (error) => { throw error; }
    });
    assert.equal(t(key as Parameters<typeof t>[0]), expected);
  });
}

test("the delivery label describes the shipping fee amount, not the dispatch schedule", () => {
  const source = readFileSync("src/components/commerce/offer.tsx", "utf8");
  assert.match(source, /<dt>\{t\(['"]delivery['"]\)\}<\/dt>\s*<dd>\{offer\.shippingFeeKRW\.toLocaleString\("ko-KR"\)\} KRW<\/dd>/);
  assert.match(source, /t\(['"]dispatchSchedule['"]\)[\s\S]*?offer\.dispatchSchedule/);
});

test("the search field filters article titles and deks and links to essays", () => {
  const source = readFileSync("src/components/shell/header-panels.tsx", "utf8");
  assert.match(source, /placeholder=\{t\(['"]searchForAnything['"]\)\}/);
  assert.match(source, /posts\.filter\(\(post\)\s*=>\s*`\$\{post\.title\} \$\{post\.dek\}`\.toLowerCase\(\)\.includes\(needle\)\)/);
  assert.match(source, /href:\s*`\/essays\/\$\{post\.slug\}`/);
});

test("the handle explanation belongs to a locked field without an editing-date promise", () => {
  const source = readFileSync("src/app/(site)/me/settings/account/page.client.tsx", "utf8");
  assert.match(source, /<LockedField\b[^>]*label=\{t\(['"]attendeeHandle['"]\)\}[^>]*reason=\{t\(['"]handleRenamingWillBeAvailableCloserToTheEvent['"]\)\}/);
});

test("the device label is the missing-user-agent fallback on listed sessions", () => {
  const source = readFileSync("src/app/(site)/me/settings/security/page.client.tsx", "utf8");
  assert.match(source, /sessions\.map\(\(sess\)/);
  assert.match(source, /\{sess\.userAgent\s*\|\|\s*t\(['"]currentDevice['"]\)\}/);
});

test("the policy return link resolves through the existing shop alias", () => {
  const policy = readFileSync("src/app/(site)/_commerce/policy-page.tsx", "utf8");
  const tickets = readFileSync("src/app/(site)/tickets/page.tsx", "utf8");
  assert.match(policy, /<Link\b[^>]*href="\/tickets"[^>]*>\s*\{t\("backToTickets"\)\}/);
  assert.match(tickets, /import ShopPage from "\.\.\/shop\/page"/);
  assert.match(tickets, /return <ShopPage\s*\/>/);
});
