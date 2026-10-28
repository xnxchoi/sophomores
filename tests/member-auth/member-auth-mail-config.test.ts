import assert from "node:assert/strict";
import { test } from "node:test";
import { loadMemberMailConfig } from "../../lib/member-auth/mail-config";

const smtpEnvironment = {
  MEMBER_AUTH_MAIL_MODE: "smtp",
  MEMBER_AUTH_SMTP_HOST: "smtp.zeptomail.com",
  MEMBER_AUTH_SMTP_PORT: "465",
  MEMBER_AUTH_SMTP_USERNAME: "emailapikey",
  MEMBER_AUTH_SMTP_PASSWORD: "synthetic-SMTP-secret",
  MEMBER_AUTH_SMTP_FROM: "concierge@sophomores.co"
};

test("member mail is disabled unless explicitly configured", () => {
  assert.equal(loadMemberMailConfig({}), null);
  assert.equal(loadMemberMailConfig({ MEMBER_AUTH_MAIL_MODE: "disabled" }), null);
  for (const mode of ["", "mail", "SMTP", " smtp", "false"])
    assert.throws(() => loadMemberMailConfig({ MEMBER_AUTH_MAIL_MODE: mode }), /configuration is invalid/);
  for (const invalid of [null, undefined, [], "smtp", 123])
    assert.throws(() => loadMemberMailConfig(invalid as never), /Member email configuration is invalid/);
});

test("member mail accepts only documented Zoho CPaaS SMTP with explicit credentials", () => {
  const config = loadMemberMailConfig(smtpEnvironment);
  assert.deepEqual(config, {
    host: "smtp.zeptomail.com", port: 465, username: "emailapikey",
    password: "synthetic-SMTP-secret", from: "concierge@sophomores.co"
  });
  assert.equal(Object.isFrozen(config), true);
  assert.equal(loadMemberMailConfig({ ...smtpEnvironment, MEMBER_AUTH_SMTP_PORT: "587" })?.port, 587);
  for (const key of Object.keys(smtpEnvironment).filter((key) => key !== "MEMBER_AUTH_MAIL_MODE")) {
    const absent = Object.fromEntries(Object.entries(smtpEnvironment).filter(([name]) => name !== key));
    assert.throws(() => loadMemberMailConfig(absent));
  }
});

test("member mail rejects injection, alternate hosts, unsafe ports and placeholders without echoing secrets", () => {
  const invalid = {
    MEMBER_AUTH_SMTP_HOST: ["localhost", "127.0.0.1", "smtp.zeptomail.com.evil.invalid", "smtp.zoho.com", "https://smtp.zeptomail.com", "smtp.zeptomail.com."],
    MEMBER_AUTH_SMTP_PORT: ["25", "0", "465 ", "0465", "2525"],
    MEMBER_AUTH_SMTP_USERNAME: ["", "REPLACE_USERNAME", "bad\r\nUSER", "a".repeat(255)],
    MEMBER_AUTH_SMTP_PASSWORD: ["", "REPLACE_PASSWORD", "password\nPRIVATE", "x".repeat(4097)],
    MEMBER_AUTH_SMTP_FROM: ["", "REPLACE_FROM", "Name <concierge@sophomores.co>", "one@example.com,two@example.com", "one@example.com\r\nBcc:private@example.com", "one@localhost", "a".repeat(65) + "@example.com"]
  };
  for (const [key, values] of Object.entries(invalid)) for (const value of values) {
    assert.throws(() => loadMemberMailConfig({ ...smtpEnvironment, [key]: value }), (error: unknown) => {
      assert.equal((error as Error).message, "Member email configuration is invalid.");
      assert.doesNotMatch((error as Error).message, /synthetic|PRIVATE|secret/);
      return true;
    });
  }
});
