import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createTranslator } from "next-intl";
import { merge } from "lodash-es";
import en from "../../messages/en.json";
import ko from "../../messages/ko.json";
import { messagesByLocale } from "@/i18n/messages";

test("Korean catalogue is an owner-controlled, byte-preserved overlay", () => {
  const bytes = readFileSync("messages/ko.json");
  assert.equal(createHash("sha256").update(bytes).digest("hex"),
    "44d2db28c98fac07dab9fea96771546390cbe79988ff4cddb35a967c1cf7a2e8");
  assert.deepEqual(messagesByLocale.en, en);
  assert.deepEqual(messagesByLocale.ko, merge({}, en, ko));
});

test("native catalogue merging falls back only for absent Korean keys", () => {
  // Installed lodash-es merge is used directly, not a second translation API.
  // An explicit blank must survive until the owner activates the breakpoint.
  const english = { Test: { instruction: "Hello {name}", blank: "English", rich: "Read <b>this</b>" } };
  const korean = { Test: { blank: "" } };
  const messages = merge({}, english, korean);
  const t = createTranslator({ locale: "ko", messages, namespace: "Test" });
  assert.equal(t("instruction", { name: "Sam" }), "Hello Sam");
  assert.equal(t("blank"), "");
  assert.equal(t.rich("rich", { b: (chunks) => `[${chunks}]` }), "Read [this]");
  assert.deepEqual(korean, { Test: { blank: "" } });
});

test("auth, Payload and phone surfaces retain canonical provider coverage", () => {
  for (const file of ["src/app/(auth)/layout.tsx", "src/app/(payload)/layout.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /NextIntlClientProvider/);
    assert.match(source, /getMessages/);
  }
  const source = readFileSync("src/lib/phone-verification/i18n.ts", "utf8");
  assert.match(source, /@\/i18n\/messages/);
  assert.doesNotMatch(source, /\.\/messages\//);
});

test("English fallback keeps singular nouns under Korean plural rules", () => {
  const tickets = createTranslator({ locale: "ko", messages: messagesByLocale.ko, namespace: "Customer.components_tickets_ticket_selection" });
  const sessions = createTranslator({ locale: "ko", messages: messagesByLocale.ko, namespace: "Customer.app_site_me_settings_page_client" });
  assert.equal(tickets("ticketCount", { quantity: 1 }), "1 ticket");
  assert.equal(tickets("ticketCount", { quantity: 2 }), "2 tickets");
  assert.equal(sessions("activeSessionCount", { count: 1 }), "1 active session");
  assert.equal(sessions("activeSessionCount", { count: 2 }), "2 active sessions");
});
