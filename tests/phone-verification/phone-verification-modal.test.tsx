import assert from "node:assert/strict";
import { test } from "node:test";
import { renderVerificationMarkup } from "../fixtures/verification-messages";
import { PhoneVerificationModal } from "@/components/Authentication/phone-verification/phone-verification-modal";
import { VerificationStudy } from "@/components/Authentication/phone-verification/verification-study";

test("a closed controlled modal does not render a phone form or challenge", () => {
  let changes = 0;
  const html = renderVerificationMarkup(
    <PhoneVerificationModal
      open={false}
      onOpenChange={() => {
        changes += 1;
      }}
      locale="en"
    />
  );
  assert.doesNotMatch(
    html,
    /type="tel"|verify@example|SPHMRS PREVIEW|role="dialog"/
  );
  assert.equal(changes, 0);
});

test("study offers a real modal trigger rather than routing to each step", () => {
  const html = renderVerificationMarkup(<VerificationStudy initialLocale="en" />);
  assert.match(html, /<button[^>]*aria-haspopup="dialog"/);
  assert.match(html, /Sign in \/ Sign up/);
  assert.doesNotMatch(html, /href="(?:sms|mailto):|\/verification\//);
  assert.doesNotMatch(html.replaceAll("한국어", ""), /[가-힣]/);
});
