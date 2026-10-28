import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PhoneVerification } from "../../components/Authentication/phone-verification/phone-verification";

test("keeps verification a single compact form rather than a landing page", () => {
  const html = renderToStaticMarkup(<PhoneVerification />);
  assert.match(html, /휴대폰 인증/);
  assert.doesNotMatch(
    html,
    /pv-editorial|pv-steps|pv-line-art|pv-panel-footer|A little closer|THE FIRST CONNECTION/
  );
});

test("renders an accessible Korean mobile-number entry screen", () => {
  const html = renderToStaticMarkup(<PhoneVerification />);
  assert.match(html, /data-slot="input-group"/);
  assert.match(html, /data-slot="field-label"/);
  assert.match(html, /<label[^>]*for="([^"]+)"[^>]*>[^<]*휴대폰 번호/);
  const phoneInput = html.match(/<input\b[^>]*type="tel"[^>]*>/)?.[0];
  assert.ok(phoneInput, "phone entry must use a telephone input");
  assert.match(phoneInput, /autoComplete="tel"/i);
  assert.match(phoneInput, /inputMode="tel"/i);
  assert.match(phoneInput, /required=""/);
  const labelTarget = html.match(/<label[^>]*for="([^"]+)"/)?.[1];
  assert.ok(labelTarget);
  assert.ok(
    phoneInput.includes(`id="${labelTarget}"`),
    "visible label must identify the phone input"
  );
  assert.match(html, /<button[^>]*type="submit"/);
});

test("makes the preview boundary visible and never opens Messages or Mail initially", () => {
  const html = renderToStaticMarkup(<PhoneVerification />);
  assert.match(html, /프리뷰|PREVIEW/i);
  assert.match(html, /연결/);
  assert.doesNotMatch(html, /href="(?:sms|mailto):/i);
  assert.doesNotMatch(html, /인증이 완료되었습니다|인증 완료!|인증되었습니다/);
});
