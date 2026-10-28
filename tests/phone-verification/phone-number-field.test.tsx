import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { PhoneNumberField } from "../../components/Authentication/phone-verification/phone-number-field";
import { messagesByLocale } from "../../lib/phone-verification/i18n";

const renderField = (value = "", error = "") =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="ko" messages={messagesByLocale.ko} timeZone="Asia/Seoul">
      <PhoneNumberField value={value} onChange={() => {}} error={error} />
    </NextIntlClientProvider>
  );

test("renders a shadcn phone field with one labelled native telephone input", () => {
  const html = renderField();
  const inputs = html.match(/<input\b[^>]*>/g) ?? [];
  assert.equal(inputs.length, 1);
  const input = inputs[0];

  for (const slot of ["field", "input-group", "input-group-control", "field-description"]) {
    assert.ok(html.includes(`data-slot="${slot}"`), `missing shadcn ${slot}`);
  }
  assert.match(html, /<label\b[^>]*for="pv-phone"[^>]*>휴대폰 번호<\/label>/);
  assert.match(html, /aria-labelledby="pv-phone-label"/);
  assert.match(input, /id="pv-phone"/);
  assert.match(input, /name="[^"]+"/);
  assert.match(input, /type="tel"/);
  assert.match(input, /autoComplete="tel"/i);
  assert.match(input, /inputMode="tel"/i);
  assert.match(input, /required=""/);
  assert.match(input, /placeholder="010-0000-0000"/);
});

test("shows the fixed Korean dialing prefix without pretending it is a selector", () => {
  const html = renderField("010-1234-5678");
  assert.match(html, /대한민국/);
  assert.match(html, /\+82/);
  assert.match(html, /value="010-1234-5678"/);
  assert.doesNotMatch(html, /<select\b|role="combobox"|aria-haspopup=|<button\b/);
  assert.doesNotMatch(html, /data-slot="field-error"|aria-invalid="true"/);
});

test("associates validation feedback with the invalid telephone input", () => {
  const html = renderField("123", "휴대폰 번호를 확인해 주세요.");
  const input = html.match(/<input\b[^>]*>/)?.[0];
  assert.ok(input);
  assert.match(input, /aria-invalid="true"/);
  assert.match(input, /aria-describedby="[^"]*\bpv-error\b[^"]*"/);
  assert.match(html, /data-slot="field-error"/);
  assert.match(html, /id="pv-error"/);
  assert.match(html, /휴대폰 번호를 확인해 주세요\./);
});
