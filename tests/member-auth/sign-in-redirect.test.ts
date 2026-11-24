import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { assertMemberAuthRequest } from "@/lib/member-auth/server";
import type { MemberAuthConfig } from "@/lib/member-auth/config";
import { assertPayloadAuthRequest, createPayloadAuthBefore } from "@/lib/member-auth/payload-policy";
import { MEMBER_PROVIDER_ERROR_CODES, MEMBER_SIGN_IN_RETURNS, memberSignInHref, memberSignInNext, memberSignInReturn, memberSocialReturn } from "@/lib/member-auth/paths";
import { isNoStorePagePath, isPrivatePagePath } from "@/lib/member-auth/private-pages";

// Owner, 24 Nov: a signed-out /account redirects to /sign-in (no modal), and sign-in returns to where they were.
// next is a closed list of the real account pages; anything else is /account (coordinator and Review-A, 24 Nov).
const origin = "http://localhost:3000";
const hostile = [
  "//evil.invalid", "//evil.invalid/me", "/\\evil.invalid", "\\\\evil.invalid", "https://evil.invalid/me", "http:evil.invalid",
  "javascript:alert(1)", "%2F%2Fevil.invalid", "/%2F%2Fevil.invalid", "/me/%2e%2e/admin", "/me/../admin", "/me/./orders", "/me//orders",
  "/me?next=//evil.invalid", "/me#x", "/ME", "/me/", "/account/continue", "/accounts", "/meet", "/sign-in", "/sign-in?next=/me",
  "/api/users/me", "/login", "/vault", "/shop/orders", "", " /me", "/me ", "/me\n", `/me/${"a".repeat(33)}`, "/me/a/b/c/d",
  undefined, null, 42, ["/me"], { toString: () => "/me" }
];

test("next is one of the real account pages; every other value falls back to /account", () => {
  for (const path of MEMBER_SIGN_IN_RETURNS) assert.equal(memberSignInNext(path), path);
  for (const value of hostile) assert.equal(memberSignInNext(value), "/account", JSON.stringify(String(value)));
});

test("identifier-shaped values never ride along: an order page collapses to the list, anything else is /account", () => {
  // Review-A, 24 Nov: syntax is not meaning. A well-formed segment can still be an order reference or a person.
  for (const order of ["/me/orders/1234", "/me/orders/ord-2f7c9a1e", "/me/orders/2f7c9a1e-55aa-4b1c-9d3e-0a1b2c3d4e5f"]) {
    assert.equal(memberSignInNext(order), "/me/orders", order);
    assert.equal(memberSignInHref(order), "/sign-in?next=/me/orders", order);
  }
  for (const value of ["/me/settings/ab12cd34", "/me/jane-doe", "/me/settings/account/12345", "/me/invitations/inv-7731", "/account/7731",
    "/me/orders-1234", "/me/settings/security-key-91"]) {
    assert.equal(memberSignInNext(value), "/account", value);
  }
});

test("the return list is exactly the account page and the /me pages on disk (an order page collapses)", () => {
  const pages = (directory: string): string[] => readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? pages(path) : name === "page.tsx" ? [path] : [];
  });
  const routes = pages("src/app/(site)/me").map((file) => file.slice("src/app/(site)".length, -"/page.tsx".length) || "/me")
    .filter((route) => !route.includes("[")).sort();
  assert.deepEqual([...MEMBER_SIGN_IN_RETURNS].filter((route) => route !== "/account").sort(), routes);
});

test("only a recognised provider error code is forwarded; any other text becomes unknown", () => {
  for (const code of MEMBER_PROVIDER_ERROR_CODES) assert.equal(memberSignInHref("/account", code), `/sign-in?next=/account&error=${code}`);
  for (const value of ["member@example.invalid", "jane_doe", "order_1234", "access_denied_for_jane", "ACCESS_DENIED", "a".repeat(20), "", ["access_denied"], 42]) {
    assert.equal(memberSignInHref("/account", value), "/sign-in?next=/account&error=unknown", JSON.stringify(value));
  }
  assert.equal(memberSignInHref("/account"), "/sign-in?next=/account", "no error, no parameter");
});

test("the sign-in link carries only a listed next and a recognised provider error code", () => {
  assert.equal(memberSignInHref("/me/orders"), "/sign-in?next=/me/orders");
  assert.equal(memberSignInHref("//evil.invalid"), "/sign-in?next=/account");
  assert.equal(memberSignInHref("/account", "access_denied"), "/sign-in?next=/account&error=access_denied");
  assert.equal(memberSignInHref("/account", "<script>"), "/sign-in?next=/account&error=unknown");
});

test("a social return to /sign-in is rebuilt from its validated next; anything else is not a sign-in return", () => {
  assert.equal(memberSignInReturn(origin, "/sign-in?next=/me"), "/sign-in?next=/me");
  assert.equal(memberSignInReturn(origin, `${origin}/sign-in?next=/me/orders`), "/sign-in?next=/me/orders");
  assert.equal(memberSignInReturn(origin, "/sign-in"), "/sign-in?next=/account");
  for (const next of ["//evil.invalid", "/\\evil.invalid", "https://evil.invalid", "%2F%2Fevil.invalid", "/me%2F..%2Fadmin"]) {
    assert.equal(memberSignInReturn(origin, `/sign-in?next=${encodeURIComponent(next)}`), "/sign-in?next=/account", next);
    assert.equal(memberSignInReturn(origin, `/sign-in?next=${next}`), "/sign-in?next=/account", next);
  }
  for (const value of ["https://evil.invalid/sign-in?next=/me", "//evil.invalid/sign-in?next=/me", "/sign-in?next=/me&member=true",
    "/sign-in?next=/me&next=/account", "/sign-in/?next=/me", "/sign-inx?next=/me", "/sign-in#next=/me", "/%73ign-in?next=/me", undefined, 1]) {
    assert.equal(memberSignInReturn(origin, value), undefined, String(value));
  }
  // The existing pins are unchanged.
  assert.equal(memberSocialReturn(origin, "/tickets"), "/tickets");
  assert.equal(memberSocialReturn(origin, "/shop/cart"), "/shop/cart");
  assert.equal(memberSocialReturn(origin, "/account/continue"), undefined);
});

test("both callback policies accept /sign-in as a pinned social return and reject mixed or hostile ones", async () => {
  const config: MemberAuthConfig = { mode: "local", origin, databaseUrl: "postgres://localhost/sophomores_verification_test_auth",
    secret: "b".repeat(64), verificationSecret: "a".repeat(64), rpId: "localhost",
    google: { clientId: "fixture", clientSecret: "fixture" }, mail: {} as NonNullable<MemberAuthConfig["mail"]> };
  const checks = [
    (body: Record<string, unknown>, query?: URLSearchParams) => assertPayloadAuthRequest(origin, "/sign-in/social", body, query),
    (body: Record<string, unknown>, query?: URLSearchParams) => assertMemberAuthRequest(config, "/sign-in/social", body, query)
  ];
  for (const check of checks) {
    for (const callbackURL of ["/sign-in?next=/me", `${origin}/sign-in?next=/me`]) {
      assert.doesNotThrow(() => check({ provider: "google", callbackURL, errorCallbackURL: "/sign-in?next=/me", newUserCallbackURL: "/sign-in?next=/me" }));
    }
    for (const callbackURL of ["/sign-in?next=//evil.invalid", "/sign-in?next=/me&member=true", "https://evil.invalid/sign-in?next=/me"]) {
      assert.throws(() => check({ provider: "google", callbackURL }), callbackURL);
    }
    for (const change of [{ errorCallbackURL: "/account" }, { newUserCallbackURL: "/account/continue" }, { errorCallbackURL: "/sign-in?next=/me/orders" }]) {
      assert.throws(() => check({ provider: "google", callbackURL: "/sign-in?next=/me", ...change }), JSON.stringify(change));
    }
    assert.throws(() => check({ provider: "google", callbackURL: "/sign-in?next=/me" }, new URLSearchParams({ callbackURL: "/account" })));
  }
  // Callback, error and new-user all pin to the same canonical return: a new social member lands on /sign-in with the
  // same next, where the inline flow shows its setup step.
  const before = createPayloadAuthBefore(origin);
  const body = { provider: "google", callbackURL: "/sign-in?next=/me/orders" };
  assert.deepEqual(await before({ path: "/sign-in/social", body, headers: new Headers(), context: {} } as never),
    { context: { body: { ...body, errorCallbackURL: "/sign-in?next=/me/orders", newUserCallbackURL: "/sign-in?next=/me/orders" } } });
});

test("/sign-in is a private page; /account and every /me page send a signed-out visitor to it, never to a modal", () => {
  assert.equal(isPrivatePagePath("/sign-in"), true);
  assert.equal(isNoStorePagePath("/sign-in"), true);
  const page = readFileSync("src/app/(site)/sign-in/page.tsx", "utf8");
  assert.match(page, /isReviewCopyRequest\(\)\) return <ReviewCustomerNoticePage/);
  assert.match(page, /const next = memberSignInNext\(/);
  assert.match(page, /if \(state\.state === "signed-in" && state\.member\) redirect\(next\)/);
  assert.match(readFileSync("src/app/(site)/sign-in/layout.tsx", "utf8"), /<PrivateRoute>/);
  const account = readFileSync("src/app/(site)/account/page.tsx", "utf8");
  assert.match(account, /if \(!\(await currentUser\(\)\)\) redirect\(memberSignInHref\(query\?\.next \?\? "\/account", query\?\.error\)\)/);
  assert.ok(account.indexOf("isReviewCopyRequest()") < account.indexOf("currentUser()"), "review copy shows its notice first");
  const pages = (directory: string): string[] => readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? pages(path) : name === "page.tsx" ? [path] : [];
  });
  for (const file of pages("src/app/(site)/me")) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\/account\?next=/, file);
    // The order page never puts its ID in the sign-in link.
    if (/redirect\(/.test(source) && /currentUser/.test(source)) assert.match(source, /redirect\(memberSignInHref\("\/me[a-z/-]*"\)\)/, file);
  }
});
