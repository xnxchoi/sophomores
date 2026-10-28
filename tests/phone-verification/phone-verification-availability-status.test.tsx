import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VerificationProvider } from "../../components/Authentication/phone-verification/phone-verification";
import { VerificationStatus } from "../../components/Authentication/phone-verification/verification-status";

test("receiver outages are distinguished from waiting and verification failure in both languages", () => {
  for (const locale of ["en", "ko"] as const) {
    const html = renderToStaticMarkup(
      <VerificationProvider initialLocale={locale}>
        <VerificationStatus state="pending" busy={false} error="receiver" checked
          expiresAt={Date.now() + 300000} onExpire={() => {}} />
      </VerificationProvider>
    );
    assert.match(html, locale === "en" ? /Message receiver unavailable/ : /메시지를 수신할 수 없어요/);
    assert.doesNotMatch(html, /Still waiting|Waiting for message|아직 대기 중|메시지 대기 중|Message verified/);
    assert.match(html, /data-status-indicator="unavailable"/);
  }
});
