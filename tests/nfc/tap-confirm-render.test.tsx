import assert from "node:assert/strict";
import test from "node:test";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import messages from "../../messages/en.json";
import { TapConfirm, type NfcTapView } from "@/app/(nfc)/nfc/_tap/tap-confirm";

const render = (view: NfcTapView) => renderToStaticMarkup(
  <NextIntlClientProvider locale="en" messages={{ Customer: { app_site_nfc_tap: messages.Customer.app_site_nfc_tap } }}>
    <TapConfirm view={view} />
  </NextIntlClientProvider>
);

test("NFC renders native confirm and sign-in submits without cursor or device providers", () => {
  const ready = render({ state: "ready", signet: "pending", formRef: "fixture", confirmation: "synthetic" });
  assert.match(ready, /<form(?=[^>]* method="post")(?=[^>]* action="\/nfc\/fixture")[^>]*>/);
  assert.match(ready, /<input type="hidden" name="confirmation" value="synthetic"/);
  assert.match(ready, /<button type="submit"/);

  const signedOut = render({ state: "signed-out" });
  assert.match(signedOut, /<form(?=[^>]* method="get")(?=[^>]* action="\/sign-in")[^>]*>/);
  assert.match(signedOut, /<button type="submit"/);
  assert.doesNotMatch(signedOut, /name="confirmation"/);
});
