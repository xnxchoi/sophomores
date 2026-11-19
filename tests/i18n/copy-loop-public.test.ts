import assert from "node:assert/strict";
import test from "node:test";
import { createTranslator } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";
import { SEEK_STEP_SECONDS } from "@/lib/content/transport";

for (const locale of ["en", "ko"] as const) {
  for (const seconds of [1, 2, 10]) {
    test(`radio seek labels format ${seconds} seconds through actual ${locale} messages`, () => {
      const t = createTranslator({
        locale, messages: messagesByLocale[locale], namespace: "Interface.radio",
        onError: (error) => { throw error; }
      });
      const unit = seconds === 1 ? "second" : "seconds";
      assert.equal(t("rewind", { seconds }), locale === "ko" ? `${seconds}초 뒤로 이동` : `Skip back ${seconds} ${unit}`);
      assert.equal(t("forward", { seconds }), locale === "ko" ? `${seconds}초 앞으로 이동` : `Skip ahead ${seconds} ${unit}`);
    });
  }

  test(`radio seek labels describe the actual transport step in ${locale}, not track navigation`, () => {
    const t = createTranslator({
      locale, messages: messagesByLocale[locale], namespace: "Interface.radio",
      onError: (error) => { throw error; }
    });
    assert.equal(SEEK_STEP_SECONDS, 10);
    assert.equal(t("rewind", { seconds: SEEK_STEP_SECONDS }), locale === "ko" ? "10초 뒤로 이동" : "Skip back 10 seconds");
    assert.equal(t("forward", { seconds: SEEK_STEP_SECONDS }), locale === "ko" ? "10초 앞으로 이동" : "Skip ahead 10 seconds");
    assert.doesNotMatch(t("rewind", { seconds: SEEK_STEP_SECONDS }), /track|song|previous/i);
    assert.doesNotMatch(t("forward", { seconds: SEEK_STEP_SECONDS }), /track|song|next/i);
  });
}
