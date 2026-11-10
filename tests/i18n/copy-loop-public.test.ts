import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createTranslator } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";
import { SEEK_STEP_SECONDS } from "@/lib/content/transport";

// Frozen pass01 approval constraints, used only by tests. Runtime copy remains
// exclusively in the canonical catalogue; unresolved policy is not approved here.
const approvedCopy = {
  "System.returnHome": "Return to home",
  "System.notFoundDescription": "This page could not be found.",
  "Interface.radio.rewind": "Skip back {seconds, plural, =1 {# second} other {# seconds}}",
  "Interface.radio.forward": "Skip ahead {seconds, plural, =1 {# second} other {# seconds}}",
  "Interface.copy.failed": "Copy failed",
  "Interface.notifications.markRead": "Mark as read",
  "Customer.components_shell_header_panels.youAreAllCaughtUp": "No unread notifications.",
  "Customer.components_shell_header_panels.closeNotification": "Mark as read",
  "Customer.app_site_me_settings_general_page_client.deepNeutralPaletteOptimizedForHighDynamicRangeDisplays": "Dark, neutral colors.",
  "Customer.app_site_me_settings_security_page_client.hardwareBackedAuthenticationUsingTouchIDFaceIDOr": "Use a passkey to sign in.",
  "PreviewAuth.user": "Username",
  "PreviewAuth.remember": "Keep me signed in on this browser",
  "Verification.helpLimitations": "A website can’t force MMS or turn off iMessage. Your carrier, plan or device may not support MMS to email recipients. If the message won’t send, ask your carrier whether your plan supports MMS to an email address."
} as const;

for (const [key, expected] of Object.entries(approvedCopy)) {
  test(`public copy pass01 retains the exact approved English contract: ${key}`, () => {
    const t = createTranslator({
      locale: "en", messages: messagesByLocale.en,
      onError: (error) => { throw error; }
    });
    assert.equal(t.raw(key as Parameters<typeof t.raw>[0]), expected);
    if (!key.startsWith("Interface.radio.")) {
      assert.equal(t(key as Parameters<typeof t>[0]), expected);
    }
  });
}

for (const locale of ["en", "ko"] as const) {
  for (const seconds of [1, 2, 10]) {
    test(`radio seek labels format ${seconds} seconds through actual ${locale} messages`, () => {
      const t = createTranslator({
        locale, messages: messagesByLocale[locale], namespace: "Interface.radio",
        onError: (error) => { throw error; }
      });
      const unit = seconds === 1 ? "second" : "seconds";
      assert.equal(t("rewind", { seconds }), `Skip back ${seconds} ${unit}`);
      assert.equal(t("forward", { seconds }), `Skip ahead ${seconds} ${unit}`);
    });
  }

  test(`radio seek labels describe the actual transport step in ${locale}, not track navigation`, () => {
    const t = createTranslator({
      locale, messages: messagesByLocale[locale], namespace: "Interface.radio",
      onError: (error) => { throw error; }
    });
    assert.equal(SEEK_STEP_SECONDS, 10);
    assert.equal(t("rewind", { seconds: SEEK_STEP_SECONDS }), "Skip back 10 seconds");
    assert.equal(t("forward", { seconds: SEEK_STEP_SECONDS }), "Skip ahead 10 seconds");
    assert.doesNotMatch(t("rewind", { seconds: SEEK_STEP_SECONDS }), /track|song|previous/i);
    assert.doesNotMatch(t("forward", { seconds: SEEK_STEP_SECONDS }), /track|song|next/i);
  });
}

test("real radio controls pass the same step to translated labels and directional seek actions", () => {
  const source = readFileSync("src/components/radio/track-player.tsx", "utf8");
  assert.equal(/label=\{t\("rewind",\s*\{\s*seconds:\s*SEEK_STEP_SECONDS\s*\}\)\}[^>]*onClick=\{\(\)\s*=>\s*seek\(-SEEK_STEP_SECONDS\)\}/.test(source), true);
  assert.equal(/label=\{t\("forward",\s*\{\s*seconds:\s*SEEK_STEP_SECONDS\s*\}\)\}[^>]*onClick=\{\(\)\s*=>\s*seek\(SEEK_STEP_SECONDS\)\}/.test(source), true);
});

test("the not-found recovery label names its existing home destination", () => {
  const source = readFileSync("src/components/layouts/Missing/not-found-screen.tsx", "utf8");
  assert.equal(/<LinkUnderlined\b[^>]*href="\/"[^>]*>\s*\{t\("returnHome"\)\}/.test(source), true);
});
