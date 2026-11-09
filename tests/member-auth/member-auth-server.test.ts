import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemberAuth, assertMemberAuthRequest, assertPasskeyUserVerification, phoneIdentifierFlowHeaders, handleMemberAuthRequest, memberAuthPath } from "@/lib/member-auth/server";
import { IDENTIFIER_COOKIE } from "@/lib/member-auth/identifier";
import type { MemberAuthConfig } from "@/lib/member-auth/config";

const config: MemberAuthConfig = {
  mode: "local", origin: "http://localhost:3240", databaseUrl: "postgres://localhost/sophomores_verification_test_auth",
  secret: "b".repeat(64), verificationSecret: "a".repeat(64), rpId: "localhost", google: null, mail: null
};
const request = (path: string, body?: Record<string, unknown>, query?: URLSearchParams) =>
  assertMemberAuthRequest(config, path, body, query);

test("auth exposes only the agreed passwordless paths and no credential-changing shortcuts", () => {
  for (const path of ["/get-session", "/sign-out", "/passkey/generate-authenticate-options", "/passkey/verify-authentication"])
    assert.doesNotThrow(() => request(path));
  for (const path of ["/sign-up/email", "/sign-in/email", "/forget-password", "/reset-password", "/change-email", "/update-user", "/delete-user", "/unlink-account", "/arbitrary", "", "/callback/other"])
    assert.throws(() => request(path));
});

test("unconfigured email and Google are unavailable, never simulated delivery", () => {
  for (const path of ["/email-otp/send-verification-otp", "/sign-in/email-otp", "/sign-in/magic-link", "/magic-link/verify"])
    assert.throws(() => request(path, { callbackURL: "/account", type: "sign-in" }));
  assert.throws(() => request("/sign-in/social", { provider: "google", callbackURL: "/account" }));
});

test("configured Google cannot accept arbitrary scopes, provider parameters or redirect targets", () => {
  const configured = { ...config, google: { clientId: "fixture.apps.googleusercontent.com", clientSecret: "private-fixture-secret" } };
  const call = (body: Record<string, unknown>) => assertMemberAuthRequest(configured, "/sign-in/social", body);
  assert.doesNotThrow(() => call({ provider: "google", callbackURL: "/account" }));
  assert.doesNotThrow(() => call({ provider: "google", callbackURL: "http://localhost:3240/account" }));
  for (const change of [
    { provider: "other" }, { scopes: ["gmail.readonly"] }, { additionalParams: { access_type: "offline" } },
    { additionalData: { member: true } }, { callbackURL: "https://evil.example" },
    { callbackURL: "//evil.example" }, { callbackURL: "/account?next=https://evil.example" },
    { errorCallbackURL: "/elsewhere" }, { newUserCallbackURL: "/elsewhere" }, { callbackURL: undefined }
  ]) assert.throws(() => call({ provider: "google", callbackURL: "/account", ...change }));
});

test("success callbacks allow only the fixed continuation while errors stay at the chooser", () => {
  const configured = { ...config, google: { clientId: "fixture.apps.googleusercontent.com", clientSecret: "private-fixture-secret" } };
  for (const callbackURL of ["/account/continue", `${config.origin}/account/continue`]) {
    assert.doesNotThrow(() => assertMemberAuthRequest(configured, "/sign-in/social", {
      provider: "google", callbackURL, newUserCallbackURL: callbackURL, errorCallbackURL: "/account"
    }));
  }
  for (const callbackURL of ["/account/continue?member=true", "/account/continue#success",
    "/account/continue/", "//evil.example/account/continue", "https://evil.example/account/continue"])
    assert.throws(() => assertMemberAuthRequest(configured, "/sign-in/social", { provider: "google", callbackURL }));
  assert.throws(() => assertMemberAuthRequest(configured, "/sign-in/social", {
    provider: "google", callbackURL: "/account/continue", errorCallbackURL: "/account/continue"
  }));
  const enabled = { ...config, mail: {} as NonNullable<MemberAuthConfig["mail"]> };
  assert.doesNotThrow(() => assertMemberAuthRequest(enabled, "/magic-link/verify", undefined,
    new URLSearchParams({ callbackURL: "/account/continue", newUserCallbackURL: "/account/continue", errorCallbackURL: "/account" })));
  assert.throws(() => assertMemberAuthRequest(enabled, "/magic-link/verify", undefined,
    new URLSearchParams({ callbackURL: "/account/continue?next=//evil.example" })));
});

test("email OTP types cannot become password reset, email change or alternate signup authorization", () => {
  const enabled = { ...config, mail: {} as NonNullable<MemberAuthConfig["mail"]> };
  assert.doesNotThrow(() => assertMemberAuthRequest(enabled, "/email-otp/send-verification-otp", { type: "sign-in" }));
  for (const type of ["forget-password", "change-email", "email-verification", null, undefined, ""])
    assert.throws(() => assertMemberAuthRequest(enabled, "/email-otp/send-verification-otp", { type }));
  assert.doesNotThrow(() => assertMemberAuthRequest(enabled, "/magic-link/verify", undefined, new URLSearchParams({ callbackURL: "/account" })));
  assert.throws(() => assertMemberAuthRequest(enabled, "/magic-link/verify", undefined, new URLSearchParams({ callbackURL: "https://evil.example" })));
});

test("WebAuthn user verification must be established server-side in both ceremonies", () => {
  assert.doesNotThrow(() => assertPasskeyUserVerification({ registrationInfo: { userVerified: true } }, "registration"));
  assert.doesNotThrow(() => assertPasskeyUserVerification({ authenticationInfo: { userVerified: true } }, "authentication"));
  for (const verification of [null, undefined, {}, { userVerified: true }, { registrationInfo: { userVerified: false } }, { registrationInfo: { userVerified: "true" } }])
    assert.throws(() => assertPasskeyUserVerification(verification, "registration"));
  for (const verification of [null, {}, { userVerified: true }, { authenticationInfo: { userVerified: false } }])
    assert.throws(() => assertPasskeyUserVerification(verification, "authentication"));
});

test("server-owned Google state restores the exact phone identifier, never a client substitute", () => {
  const token = "a".repeat(43);
  const restored = phoneIdentifierFlowHeaders(new Headers({ cookie: "other=value" }), token);
  assert.match(restored.get("cookie")!, new RegExp(`${IDENTIFIER_COOKIE}=${token}`));
  assert.equal(phoneIdentifierFlowHeaders(new Headers(), undefined).get("cookie"), null);
  assert.throws(() => phoneIdentifierFlowHeaders(new Headers(), "bad"));
  assert.throws(() => phoneIdentifierFlowHeaders(new Headers({ cookie: `${IDENTIFIER_COOKIE}=${"b".repeat(43)}` }), token));
});

test("only the pinned Google callback resolves from Better Auth's endpoint template", () => {
  assert.equal(memberAuthPath("/callback/:id", { id: "google" }), "/callback/google");
  for (const params of [{}, { id: "other" }, { id: ["google"] }])
    assert.throws(() => request(memberAuthPath("/callback/:id", params)));
});

test("local wrapper enforces origin/body bounds and replaces spoofed rate-limit headers", async () => {
  let calls = 0;
  const handler = { handler: async (incoming: Request) => {
    calls++;
    assert.equal(incoming.headers.get("x-member-local-ip"), "127.0.0.1");
    assert.equal(incoming.headers.get("x-forwarded-for"), null);
    return Response.json({ safe: true });
  } };
  const make = (origin = config.origin, extra: HeadersInit = {}, body = "{}") => new Request(`${config.origin}/api/auth/sign-out`, {
    method: "POST", headers: { host: "localhost:3240", origin, "content-type": "application/json", ...extra }, body
  });
  assert.equal((await handleMemberAuthRequest(handler, config, make("https://evil.example"))).status, 403);
  assert.equal((await handleMemberAuthRequest(handler, config, make(config.origin, { host: "evil.example" }))).status, 403);
  assert.equal((await handleMemberAuthRequest(handler, config, make(config.origin, { "content-type": "text/plain" }))).status, 415);
  assert.equal((await handleMemberAuthRequest(handler, config, make(config.origin, {}, "a".repeat(65537)))).status, 413);
  const good = await handleMemberAuthRequest(handler, config, make(config.origin, { "x-forwarded-for": "evil", "x-member-local-ip": "evil" }));
  assert.equal(good.status, 200);
  assert.equal(good.headers.get("cache-control"), "private, no-store");
  assert.equal(calls, 1);
  const failed = await handleMemberAuthRequest({ handler: async () => new Response("PRIVATE PROVIDER ERROR", { status: 500 }) }, config, make());
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /PRIVATE PROVIDER/);
});

test("ticket Google continuation is exact, coherent and navigation only", () => {
  const configured = { ...config, google: { clientId: "fixture", clientSecret: "fixture" }, mail: {} as NonNullable<MemberAuthConfig["mail"]> };
  const call = (path: string, body: Record<string, unknown>, query?: URLSearchParams) => assertMemberAuthRequest(configured, path, body, query);
  for (const callbackURL of ["/tickets", `${config.origin}/tickets`]) {
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

test("local middleware rejects array-valued callback query keys before normalization", async () => {
  const auth = createMemberAuth(config, {
    pool: { connect: async () => { throw new Error("Database access is forbidden in this middleware test"); } } as unknown as import("pg").Pool,
    isActiveMember: async () => false,
    sendMail: async () => {},
  });
  await auth.$context;
  const before = auth.options.hooks!.before!;
  for (const key of ["callbackURL", "errorCallbackURL", "newUserCallbackURL"]) {
    await assert.rejects(before({ path: "/sign-in/social", body: { provider: "google", callbackURL: "/tickets" },
      query: { [key]: ["/tickets", "/account"] }, headers: new Headers(), context: {} } as never),
      { status: "FORBIDDEN" });
  }
});
