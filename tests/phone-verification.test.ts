import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildMessageHref,
  canOpenComposer,
  createPreviewChallenge,
  messagingPlatform,
  normalizeKoreanMobile,
  remainingSeconds
} from "../lib/phone-verification/model";

test("normalizes Korean mobile numbers without accepting other destinations", () => {
  for (const input of [
    "01012345678",
    "010-1234-5678",
    "010 1234 5678",
    "+821012345678",
    "+82 10-1234-5678"
  ]) {
    assert.equal(normalizeKoreanMobile(input), "+821012345678", input);
  }
  for (const input of [
    "",
    " ",
    "0101234567",
    "010123456789",
    "01112345678",
    "0212345678",
    "+12025550123",
    "+8201012345678",
    "010.1234.5678",
    "01012345678;01011112222",
    "０１０１２３４５６７８",
    "01012345678💌",
    "01012345678' OR 1=1",
    null,
    undefined,
    1012345678,
    {},
    []
  ]) {
    assert.equal(normalizeKoreanMobile(input as string), null, String(input));
  }
});

test("normalization is stable over a large independent batch", () => {
  const inputs = Array.from(
    { length: 10_000 },
    (_, index) => `010${String(index).padStart(8, "0")}`
  );
  const normalized = inputs.map(normalizeKoreanMobile);
  assert.equal(normalized.length, 10_000);
  assert.equal(new Set(normalized).size, 10_000);
  assert.equal(normalized[0], "+821000000000");
  assert.equal(normalized[9_999], "+821000009999");
  assert.equal(inputs[0], "01000000000");
});

test("detects iOS and Android messaging links while retaining a desktop fallback", () => {
  assert.equal(
    messagingPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"),
    "ios"
  );
  assert.equal(
    messagingPlatform("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)"),
    "ios"
  );
  assert.equal(
    messagingPlatform(
      "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)"
    ),
    "ios"
  );
  assert.equal(
    messagingPlatform(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15",
      5
    ),
    "ios"
  );
  assert.equal(messagingPlatform("MacIntel", 2), "ios");
  assert.equal(messagingPlatform("MacIntel", 0), "manual");
  assert.equal(
    messagingPlatform("Mozilla/5.0 (Linux; Android 15; Pixel 9)"),
    "android"
  );
  for (const input of [
    "",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
    null,
    undefined,
    5
  ]) {
    assert.equal(messagingPlatform(input as string), "manual");
  }
});

test("builds Messages-only composer links with encoded text for each mobile platform", () => {
  const body = "SPHMRS 인증 💌 &?=# + 한글";
  assert.equal(
    buildMessageHref("verify@example.com", body, "ios"),
    `sms:verify@example.com&body=${encodeURIComponent(body)}`
  );
  assert.equal(
    buildMessageHref("verify@example.com", body, "android"),
    `sms:verify@example.com?body=${encodeURIComponent(body)}`
  );
  assert.equal(buildMessageHref("verify@example.com", body, "manual"), null);
  assert.equal(
    buildMessageHref("verify@example.com", "x".repeat(500), "ios"),
    `sms:verify@example.com&body=${"x".repeat(500)}`
  );
});

test("rejects invalid recipients, multiple destinations and header injection", () => {
  for (const recipient of [
    "",
    "verify",
    "@example.com",
    "verify@",
    "verify@example.com,other@example.com",
    "verify@example.com;other@example.com",
    "verify@example.com?bcc=other@example.com",
    "verify@example.com\r\nBcc:other@example.com",
    "verify@example.com&body=evil",
    "mailto:verify@example.com",
    "sms:verify@example.com",
    "+821012345678",
    null,
    undefined,
    {},
    5
  ]) {
    assert.equal(
      buildMessageHref(recipient as string, "challenge", "ios"),
      null,
      String(recipient)
    );
  }
  for (const body of ["", "   ", "x".repeat(501), null, undefined, {}, 5]) {
    assert.equal(
      buildMessageHref("verify@example.com", body as string, "ios"),
      null
    );
  }
  assert.equal(
    buildMessageHref("verify@example.com", "challenge", "invalid" as "ios"),
    null
  );
});

test("creates explicitly non-operational five-minute preview challenges", () => {
  const now = 1_700_000_000_000;
  const challenge = createPreviewChallenge("+821012345678", now);
  assert.deepEqual(challenge, {
    phone: "+821012345678",
    recipient: "verify@example.invalid",
    body: "SPHMRS PREVIEW — NOT A VALID CODE",
    expiresAt: now + 300_000,
    mode: "preview"
  });
  assert.equal(canOpenComposer(challenge.mode), false);
  assert.notEqual(createPreviewChallenge("+821012345678", now), challenge);
  assert.equal(challenge.expiresAt, now + 300_000);
});

test("only an explicitly live transport may open a composer", () => {
  assert.equal(canOpenComposer("live"), true);
  for (const mode of ["preview", "", "LIVE", null, undefined, 1, {}]) {
    assert.equal(canOpenComposer(mode as "preview"), false);
  }
});

test("countdown rounds up and never returns negative time", () => {
  assert.equal(remainingSeconds(300_000, 0), 300);
  assert.equal(remainingSeconds(300_000, 1), 300);
  assert.equal(remainingSeconds(300_000, 299_001), 1);
  assert.equal(remainingSeconds(300_000, 300_000), 0);
  assert.equal(remainingSeconds(300_000, 300_001), 0);
});
