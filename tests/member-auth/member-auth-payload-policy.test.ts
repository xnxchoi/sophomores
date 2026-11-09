import assert from "node:assert/strict";
import test from "node:test";
import { assertPayloadAuthRequest, beforePayloadSessionCreate, createPayloadAuthBefore, createPayloadPasskeyPolicy } from "@/lib/member-auth/payload-policy";

const origin = "http://localhost:3000";

test("canonical requests retain account and CMS callbacks without accepting arbitrary destinations", () => {
  for (const callbackURL of ["/admin", "/account", "/account/continue", `${origin}/admin`]) {
    assert.doesNotThrow(() => assertPayloadAuthRequest(origin, "/sign-in/magic-link", { callbackURL }));
  }
  for (const callbackURL of ["https://evil.invalid/admin", "//evil.invalid/admin", "/admin-evil", "/other"]) {
    assert.throws(() => assertPayloadAuthRequest(origin, "/sign-in/magic-link", { callbackURL }));
  }
});

test("phone OTP authentication, mutable identity, provider scope expansion and malformed OTP are refused", () => {
  assert.throws(() => assertPayloadAuthRequest(origin, "/phone-number/verify", {}));
  assert.throws(() => assertPayloadAuthRequest(origin, "/update-user", { email: "staff@sophomores.co" }));
  for (const key of ["role", "membershipStatus", "ticketTier", "emailVerified", "serverContext", "scopes"]) {
    assert.throws(() => assertPayloadAuthRequest(origin, "/sign-in/social", { provider: "google", callbackURL: "/account", [key]: true }));
  }
  assert.throws(() => assertPayloadAuthRequest(origin, "/sign-in/email-otp", { otp: "12" }));
  assert.doesNotThrow(() => assertPayloadAuthRequest(origin, "/sign-in/email-otp", { otp: "Ab12Cd" }));
});

test("canonical passkey verification enforces UV before any membership lookup", async () => {
  const policy = createPayloadPasskeyPolicy();
  await assert.rejects(policy.registration.afterVerification({ verification: {}, user: { id: "any" } }));
  await assert.rejects(policy.authentication.afterVerification({ verification: {}, clientData: { id: "credential" }, ctx: {} }));
});

test("verified passkeys still require registered membership and an actual canonical credential owner", async () => {
  const original = process.env.MEMBER_AUTH_MODE;
  process.env.MEMBER_AUTH_MODE = "disabled";
  try {
    const policy = createPayloadPasskeyPolicy();
    await assert.rejects(policy.registration.afterVerification({ verification: { registrationInfo: { userVerified: true } }, user: { id: "pending" } }));
    await assert.rejects(policy.authentication.afterVerification({ verification: { authenticationInfo: { userVerified: true } }, clientData: { id: "unknown" }, ctx: {} }));
    await assert.rejects(beforePayloadSessionCreate({ userId: "member" }, {
      headers: { cookie: `sophomores-phone-identifier=${"a".repeat(43)}` },
    }), { code: "UNAVAILABLE" });
  } finally {
    if (original === undefined) delete process.env.MEMBER_AUTH_MODE;
    else process.env.MEMBER_AUTH_MODE = original;
  }
});

test("phone account selection cannot be bypassed by switching an already existing session", async () => {
  const before = createPayloadAuthBefore(origin);
  await assert.rejects(before({ path: "/multi-session/set-active", body: { sessionToken: "another-account" },
    headers: new Headers({ cookie: `sophomores-phone-identifier=${"a".repeat(43)}` }), context: {} } as never));
  assert.equal(await before({ path: "/multi-session/set-active", body: { sessionToken: "another-account" },
    headers: new Headers(), context: {} } as never), undefined);
});

test("sensitive member operations do not authorize from an earlier cached session", async () => {
  const before = createPayloadAuthBefore(origin);
  const context = { options: { database: {} },
    session: { user: { id: "cached-user", emailVerified: true }, session: { createdAt: new Date() } } };
  await assert.rejects(before({ path: "/passkey/generate-register-options", headers: new Headers(),
    responseHeaders: new Headers(), context } as never));
  assert.equal(context.session, null);
});

test("middleware normalizes OTP, pins member callbacks and preserves the approved CMS destination", async () => {
  const before = createPayloadAuthBefore(origin);
  assert.deepEqual(await before({ path: "/sign-in/email-otp", body: { otp: "ab12cd" },
    headers: new Headers(), context: {} } as never), { context: { body: { otp: "AB12CD" } } });
  for (const path of ["/sign-in/magic-link", "/sign-in/social"]) {
    const body = { provider: "google", callbackURL: "/account" };
    assert.deepEqual(await before({ path, body, headers: new Headers(), context: {}, query: { ignored: [] } } as never),
      { context: { body: { ...body, callbackURL: "/account/continue", errorCallbackURL: "/account", newUserCallbackURL: "/account/continue" } } });
  }
  for (const callbackURL of ["/admin", `${origin}/admin`]) {
    assert.equal(await before({ path: "/sign-in/magic-link", body: { callbackURL }, headers: new Headers(), context: {} } as never), undefined);
  }
});

test("session creation retains its principal but never silently drops an unreadable phone constraint", async () => {
  const session = { userId: "9e7947d3-2241-432b-a84b-21226aa40bfd" };
  assert.deepEqual(await beforePayloadSessionCreate(session, null), { data: session });
  await assert.rejects(beforePayloadSessionCreate(session, { path: "/sign-in/email-otp", headers: { cookie: "sophomores-phone-identifier=invalid" } }));
});

test("request validation enforces OTP purpose, profile bounds and query callback safety", () => {
  assert.doesNotThrow(() => assertPayloadAuthRequest(origin, "/get-session"));
  assert.doesNotThrow(() => assertPayloadAuthRequest(origin, "/update-user", { name: "Member", localePreference: "ko" }));
  for (const name of [17, "x".repeat(81), "line\nbreak"]) {
    assert.throws(() => assertPayloadAuthRequest(origin, "/update-user", { name }));
  }
  for (const body of [{ provider: "github", callbackURL: "/account" }, { provider: "google" }]) {
    assert.throws(() => assertPayloadAuthRequest(origin, "/sign-in/social", body));
  }
  assert.throws(() => assertPayloadAuthRequest(origin, "/email-otp/send-verification-otp", { type: "email-verification" }));
  assert.doesNotThrow(() => assertPayloadAuthRequest(origin, "/email-otp/send-verification-otp", { type: "sign-in" }));
  assert.throws(() => assertPayloadAuthRequest(origin, "/sign-in/magic-link", {}));
  assert.throws(() => assertPayloadAuthRequest(origin, "/magic-link/verify", {}, new URLSearchParams({ callbackURL: "https://evil.invalid" })));
});

test("ticket Google continuation is exact, coherent and navigation only", () => {

  const call = (path: string, body: Record<string, unknown>, query?: URLSearchParams) => assertPayloadAuthRequest(origin, path, body, query);
  for (const callbackURL of ["/tickets", `${origin}/tickets`]) {
    assert.doesNotThrow(() => call("/sign-in/social", { provider: "google", callbackURL, errorCallbackURL: callbackURL, newUserCallbackURL: callbackURL }));
    for (const path of ["/link-social", "/sign-in/magic-link", "/magic-link/verify"])
      assert.throws(() => call(path, { provider: "google", callbackURL }));
  }
  for (const callbackURL of ["//evil.invalid/tickets", "https://evil.invalid/tickets", "/tickets?member=true", "/tickets#success", "/%74ickets", "/tickets/", "/tickets%3fmember=true"])
    assert.throws(() => call("/sign-in/social", { provider: "google", callbackURL }));
  for (const change of [{ errorCallbackURL: "/account" }, { newUserCallbackURL: "/account/continue" }, { callbackURL: "/account", errorCallbackURL: "/tickets" }, { member: true }, { serverContext: { member: true } }])
    assert.throws(() => call("/sign-in/social", { provider: "google", callbackURL: "/tickets", ...change }));
  assert.throws(() => call("/sign-in/social", { provider: "google", callbackURL: "/tickets" }, new URLSearchParams({callbackURL: "/account"})));
  assert.throws(() => call("/sign-in/social", { provider: "google", callbackURL: "/tickets" }, new URLSearchParams("callbackURL=/tickets&callbackURL=/account")));
});

test("Google middleware preserves ticket continuation without changing member authority", async () => {
  const before = createPayloadAuthBefore(origin);
  for (const callbackURL of ["/tickets", `${origin}/tickets`]) {
    const body = { provider: "google", callbackURL };
    assert.deepEqual(await before({ path: "/sign-in/social", body, headers: new Headers(), context: {} } as never),
      { context: { body: { ...body, callbackURL: "/tickets", errorCallbackURL: "/tickets", newUserCallbackURL: "/tickets" } } });
  }
});

test("middleware rejects array-valued callback query keys before normalization", async () => {
  const before = createPayloadAuthBefore(origin);
  for (const key of ["callbackURL", "errorCallbackURL", "newUserCallbackURL"]) {
    await assert.rejects(before({ path: "/sign-in/social", body: { provider: "google", callbackURL: "/tickets" },
      query: { [key]: ["/tickets", "/account"] }, headers: new Headers(), context: {} } as never));
  }
});
