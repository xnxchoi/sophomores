import { JSDOM } from "jsdom";
import { messagesByLocale } from "@/lib/phone-verification/i18n";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VerificationProvider } from "@/components/Authentication/phone-verification/phone-verification";
import { VerificationStatus } from "@/components/Authentication/phone-verification/verification-status";

test("receiver outages are distinguished from waiting and verification failure in both languages", () => {
  for (const locale of ["en", "ko"] as const) {
    const html = renderToStaticMarkup(
      <VerificationProvider initialLocale={locale}>
        <VerificationStatus state="pending" busy={false} error="receiver" checked
          expiresAt={Date.now() + 300000} onExpire={() => {}} />
      </VerificationProvider>
    );
    const dom = new JSDOM(html);
    try {
      const status = dom.window.document.querySelector('[role="status"]');
      const labels = messagesByLocale[locale].VerificationTrial.registration.status;
      assert.equal(status?.textContent, labels.receiverUnavailable);
      for (const other of [labels.pending, labels.notReceived, labels.verified]) {
        assert.notEqual(status?.textContent, other, "receiver outage is not a waiting or successful verification state");
      }
      assert.equal(status?.querySelector('[data-status-indicator="unavailable"]') !== null, true);
      assert.equal(status?.querySelector('[data-status-indicator="waiting"], [data-status-indicator="verified"]') === null, true);
    } finally {
      dom.window.close();
    }
  }
});
