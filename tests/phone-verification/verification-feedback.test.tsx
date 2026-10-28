import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VerificationProvider } from "../../components/phone-verification/phone-verification";
import { ChallengeCard } from "../../components/phone-verification/verification-ui";
import { copyVerificationValue } from "../../lib/phone-verification/clipboard";

test("copy writes the exact challenge body, including spaces and punctuation", async () => {
  const values: string[] = [];
  const body = "SPHMRS ABCDEF 123456 — exact";
  assert.equal(await copyVerificationValue(body, { writeText: async value => { values.push(value); } }), true);
  assert.deepEqual(values, [body]);
});

test("unavailable or rejected clipboard never reports success", async () => {
  assert.equal(await copyVerificationValue("code", undefined), false);
  assert.equal(await copyVerificationValue("code", { writeText: async () => { throw new Error("denied"); } }), false);
});

test("challenge offers separate localized copy actions and selectable exact values", () => {
  for (const locale of ["en", "ko"] as const) {
    const html = renderToStaticMarkup(<VerificationProvider initialLocale={locale}><ChallengeCard recipient="verify@example.invalid" body="SPHMRS EXACT 123456" /></VerificationProvider>);
    assert.match(html, /SPHMRS EXACT 123456/);
    assert.match(html, /verify@example.invalid/);
    assert.match(html, /select-all/);
    assert.match(html, locale === "en" ? /Copy code/ : /인증 코드 복사/);
    assert.match(html, locale === "en" ? /Copy recipient/ : /받는 사람 복사/);
  }
});
