import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { decodeProtectedHeader, jwtVerify } from "jose";
import {
  enabledSocialProviders,
  memberSocialProviders,
  readySocialProviders,
  memberTrustedOrigins
} from "@/lib/auth/social-providers";
import {
  configuredMemberCapabilities,
  resolveMemberCapabilities,
  loadPayloadMemberConfig
} from "@/lib/member-auth/payload-config";
import {
  assertPayloadAuthRequest,
  createPayloadAuthBefore
} from "@/lib/member-auth/payload-policy";
import { memberAuthPath } from "@/lib/member-auth/server";

// Synthetic credentials only: nothing here reaches a provider.
const google = {
  MEMBER_AUTH_GOOGLE_CLIENT_ID: "123-fixture.apps.googleusercontent.com",
  MEMBER_AUTH_GOOGLE_CLIENT_SECRET: "google-fixture-secret"
};
// A throwaway P-256 key stands in for the .p8 contents, \n-escaped as in the env.
const appleKeys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const applePem = appleKeys.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const apple = {
  MEMBER_AUTH_APPLE_CLIENT_ID: "co.sophomores.fixture",
  MEMBER_AUTH_APPLE_TEAM_ID: "TEAMFIXT01",
  MEMBER_AUTH_APPLE_KEY_ID: "KEYFIXTU01",
  MEMBER_AUTH_APPLE_PRIVATE_KEY: applePem.trim().replace(/\n/g, "\\n")
};
const withoutSecret = (options: { clientSecret?: unknown } | undefined) => {
  const { clientSecret: _secret, ...rest } = options!;
  return rest;
};
const kakao = {
  MEMBER_AUTH_KAKAO_CLIENT_ID: "kakao-fixture-rest-key",
  MEMBER_AUTH_KAKAO_CLIENT_SECRET: "kakao-fixture-secret"
};
const origin = "http://localhost:3000";
const member = {
  MEMBER_AUTH_MODE: "local",
  MEMBER_AUTH_ORIGIN: origin,
  DATABASE_URI: "postgres://fixture:synthetic@localhost:4141/sopho",
  BETTER_AUTH_SECRET: "a".repeat(64),
  PHONE_VERIFICATION_MODE: "local",
  PHONE_VERIFICATION_TRANSPORT: "fixture",
  PHONE_VERIFICATION_ORIGIN: origin,
  PHONE_VERIFICATION_DATABASE_URL:
    "postgres://fixture:synthetic@localhost:4141/sopho",
  PHONE_VERIFICATION_STATE_SECRET: "b".repeat(64),
  PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET:
    "fixture-webhook-secret-0000000000000",
  PHONE_VERIFICATION_RECIPIENT: "fixture@example.test",
  PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: "100",
  PHONE_VERIFICATION_ZOHO_USER_ID: "101",
  PHONE_VERIFICATION_ZOHO_INTEGRATION_ID: "102"
};

test("each provider is enabled only by its own credentials, and Kakao also needs its switch", () => {
  assert.deepEqual(enabledSocialProviders({}), []);
  assert.deepEqual(enabledSocialProviders({ ...google }), ["google"]);
  assert.deepEqual(enabledSocialProviders({ ...apple }), ["apple"]);
  assert.deepEqual(
    enabledSocialProviders({
      MEMBER_AUTH_APPLE_CLIENT_ID: apple.MEMBER_AUTH_APPLE_CLIENT_ID
    }),
    []
  );
  assert.deepEqual(enabledSocialProviders({ ...kakao }), []);
  assert.deepEqual(
    enabledSocialProviders({ ...kakao, MEMBER_AUTH_KAKAO_ENABLED: "false" }),
    []
  );
  assert.deepEqual(
    enabledSocialProviders({ ...kakao, MEMBER_AUTH_KAKAO_ENABLED: "1" }),
    []
  );
  assert.deepEqual(
    enabledSocialProviders({ MEMBER_AUTH_KAKAO_ENABLED: "true" }),
    []
  );
  assert.deepEqual(
    enabledSocialProviders({ ...kakao, MEMBER_AUTH_KAKAO_ENABLED: "true" }),
    ["kakao"]
  );
  // The existing unprefixed Google variables keep working.
  assert.deepEqual(
    enabledSocialProviders({
      GOOGLE_CLIENT_ID: "x.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "y"
    }),
    ["google"]
  );
});

test("switching Kakao on or off changes nothing else", async () => {
  const off = {
    ...google,
    ...apple,
    ...kakao,
    MEMBER_AUTH_KAKAO_ENABLED: "false"
  };
  const on = { ...off, MEMBER_AUTH_KAKAO_ENABLED: "true" };
  assert.deepEqual(enabledSocialProviders(off), ["apple", "google"]);
  assert.deepEqual(enabledSocialProviders(on), ["apple", "google", "kakao"]);
  const withoutKakao = memberSocialProviders(off);
  const withKakao = memberSocialProviders(on);
  assert.deepEqual(Object.keys(withoutKakao).sort(), ["apple", "google"]);
  assert.deepEqual(Object.keys(withKakao).sort(), ["apple", "google", "kakao"]);
  assert.deepEqual(withoutSecret(await withKakao.apple!()), withoutSecret(await withoutKakao.apple!()));
  assert.deepEqual(withKakao.google, withoutKakao.google);
  const trusted = (env: Record<string, string>, request: Request) => {
    const origins = memberTrustedOrigins(origin, memberSocialProviders(env));
    return Array.isArray(origins) ? origins : origins(request);
  };
  const appleReturn = new Request(`${origin}/api/auth/callback/apple`, { method: "POST" });
  assert.deepEqual(await trusted(on, appleReturn), await trusted(off, appleReturn));
});

test("providers keep identity narrow: no ID-token sign-in, verified email required, fixed scopes", async () => {
  const providers = memberSocialProviders({
    ...google,
    ...apple,
    ...kakao,
    MEMBER_AUTH_KAKAO_ENABLED: "true"
  });
  const resolved = { google: providers.google!, kakao: providers.kakao!, apple: await providers.apple!() };
  for (const id of ["apple", "google", "kakao"] as const) {
    const options = resolved[id];
    assert.equal(options.disableIdTokenSignIn, true, id);
    assert.equal(options.requireEmailVerification, true, id);
  }
  assert.deepEqual(providers.google!.scope, ["openid", "email", "profile"]);
  assert.equal(providers.kakao!.disableDefaultScope, true);
  assert.deepEqual(providers.kakao!.scope, [
    "account_email",
    "profile_nickname"
  ]);
  assert.equal(resolved.apple.clientId, apple.MEMBER_AUTH_APPLE_CLIENT_ID);
});

test("Apple is on only with its own four values; Apple Music's names never count", () => {
  for (const missing of Object.keys(apple)) {
    const partial: Record<string, string> = { ...apple };
    delete partial[missing];
    assert.deepEqual(enabledSocialProviders(partial), [], missing);
  }
  // APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY belong to Apple Music.
  assert.deepEqual(enabledSocialProviders({
    MEMBER_AUTH_APPLE_CLIENT_ID: apple.MEMBER_AUTH_APPLE_CLIENT_ID,
    APPLE_TEAM_ID: apple.MEMBER_AUTH_APPLE_TEAM_ID, APPLE_KEY_ID: apple.MEMBER_AUTH_APPLE_KEY_ID,
    APPLE_PRIVATE_KEY: apple.MEMBER_AUTH_APPLE_PRIVATE_KEY
  }), []);
  // A static client secret is no longer a way to turn Apple on.
  assert.deepEqual(enabledSocialProviders({
    MEMBER_AUTH_APPLE_CLIENT_ID: apple.MEMBER_AUTH_APPLE_CLIENT_ID, MEMBER_AUTH_APPLE_CLIENT_SECRET: "static-secret"
  }), []);
  // An unreadable key fails closed instead of offering a broken Apple button.
  assert.deepEqual(enabledSocialProviders({ ...apple, MEMBER_AUTH_APPLE_PRIVATE_KEY: "not a key" }), []);
  // The key also works with real line breaks.
  assert.deepEqual(enabledSocialProviders({ ...apple, MEMBER_AUTH_APPLE_PRIVATE_KEY: applePem }), ["apple"]);
});

test("Apple's client secret is an ES256 JWT minted with jose, cached and re-minted before expiry", async () => {
  const clock = { now: Date.UTC(2026, 10, 16, 12) };
  const providers = memberSocialProviders(apple, { now: () => clock.now });
  const verify = async (token: string) => (await jwtVerify(token, appleKeys.publicKey, {
    algorithms: ["ES256"], issuer: apple.MEMBER_AUTH_APPLE_TEAM_ID, subject: apple.MEMBER_AUTH_APPLE_CLIENT_ID,
    audience: "https://appleid.apple.com", currentDate: new Date(clock.now)
  })).payload;
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
  // Better Auth awaits the lazy options once at startup, so the first secret is ready.
  const options = await providers.apple!();
  const first = options.clientSecret as string;
  assert.equal(decodeProtectedHeader(first).kid, apple.MEMBER_AUTH_APPLE_KEY_ID);
  assert.equal(decodeProtectedHeader(first).alg, "ES256");
  const claims = await verify(first);
  assert.equal(claims.iat, clock.now / 1000);
  const lifetime = claims.exp! - claims.iat!;
  assert.ok(lifetime > 0 && lifetime <= 7 * 24 * 3600, "well under Apple's six-month limit");
  clock.now += (lifetime / 4) * 1000;
  assert.equal(options.clientSecret, first, "reused while most of its life remains");
  await settle();
  assert.equal(options.clientSecret, first);
  clock.now += (lifetime / 2) * 1000;
  assert.equal(options.clientSecret, first, "still valid while the re-mint runs");
  await settle();
  const second = options.clientSecret as string;
  assert.notEqual(second, first, "re-minted before it expires");
  assert.equal((await verify(second)).iat, clock.now / 1000);
  assert.doesNotMatch(JSON.stringify(options), /PRIVATE KEY|BEGIN/);
});

// jose's importPKCS8 accepts only PKCS #8. A SEC1 "BEGIN EC PRIVATE KEY" key parses in
// Node but not in jose, so it must turn off Apple alone, never all of auth.
test("an SEC1 Apple key turns off only Apple", async () => {
  const sec1 = appleKeys.privateKey.export({ type: "sec1", format: "pem" }).toString();
  assert.match(sec1, /BEGIN EC PRIVATE KEY/);
  const env = { ...apple, ...google, MEMBER_AUTH_APPLE_PRIVATE_KEY: sec1.trim().replace(/\n/g, "\\n") };
  assert.deepEqual(enabledSocialProviders(env), ["google"]);
  const providers = memberSocialProviders(env);
  assert.equal((await providers.apple!()).enabled, false);
  assert.equal(providers.google?.clientId, google.MEMBER_AUTH_GOOGLE_CLIENT_ID);
});

test("a key jose refuses at startup leaves Apple off and every other provider working", async () => {
  const errors: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    const providers = memberSocialProviders({ ...apple, ...google }, { now: Date.now }, async () => {
      throw new TypeError("jose refused the key");
    });
    assert.equal(errors.length, 0, "provider construction does not import the signing key");
    const configured = loadPayloadMemberConfig({ ...member, ...apple, ...google })!;
    const [flags, options] = await Promise.all([
      resolveMemberCapabilities(configured, () => readySocialProviders(providers)),
      providers.apple!(),
    ]);
    assert.equal(flags.apple, false);
    assert.equal(flags.google, true);
    const trusted = memberTrustedOrigins(origin, providers);
    assert.equal(typeof trusted, "function");
    if (typeof trusted !== "function") return assert.fail("expected scoped origin callback");
    assert.deepEqual(await trusted(new Request(`${origin}/api/auth/callback/apple`, { method: "POST" })), [origin]);
    assert.equal(options.enabled, false);
    assert.equal(providers.google?.clientId, google.MEMBER_AUTH_GOOGLE_CLIENT_ID);
    assert.equal(JSON.stringify(errors).includes("BEGIN"), false, "the key is never logged");
    assert.ok(errors.length > 0, "the refusal is logged");
  } finally {
    console.error = original;
  }
});

test("appleid.apple.com is trusted only for Apple's own callback POST", async () => {
  assert.deepEqual(memberTrustedOrigins(origin, memberSocialProviders({})), [origin]);
  assert.deepEqual(memberTrustedOrigins(origin, memberSocialProviders(google)), [origin]);
  const origins = memberTrustedOrigins(origin, memberSocialProviders(apple));
  assert.equal(typeof origins, "function");
  const forRequest = (path: string, method: string) =>
    (origins as (request?: Request) => Promise<string[]>)(new Request(`${origin}${path}`, { method }));
  assert.deepEqual(await forRequest("/api/auth/callback/apple", "POST"), [origin, "https://appleid.apple.com"]);
  for (const [path, method] of [["/api/auth/callback/apple", "GET"], ["/api/auth/sign-in/social", "POST"],
    ["/api/auth/callback/google", "POST"], ["/api/auth/sign-in/email-otp", "POST"], ["/api/auth/callback/apple/x", "POST"]])
    assert.deepEqual(await forRequest(path, method), [origin], `${method} ${path}`);
  assert.deepEqual(await (origins as (request?: Request) => Promise<string[]>)(), [origin]);
});

test("public capabilities list Apple, Google and Kakao after the same Apple readiness check", async () => {
  assert.deepEqual(configuredMemberCapabilities(null), {
    emailOtp: false,
    magicLink: false,
    google: false,
    apple: false,
    kakao: false,
    passkey: false
  });
  const off = loadPayloadMemberConfig({
    ...member,
    ...google,
    ...apple,
    ...kakao
  });
  const on = loadPayloadMemberConfig({
    ...member,
    ...google,
    ...apple,
    ...kakao,
    MEMBER_AUTH_KAKAO_ENABLED: "true"
  });
  if (!off || !on) return assert.fail("fixture configuration must load");
  const offFlags = await resolveMemberCapabilities(off, () => readySocialProviders(memberSocialProviders(apple)));
  const onFlags = await resolveMemberCapabilities(on, () => readySocialProviders(memberSocialProviders(apple)));
  assert.deepEqual(
    { apple: offFlags.apple, google: offFlags.google, kakao: offFlags.kakao },
    { apple: true, google: true, kakao: false }
  );
  assert.deepEqual(onFlags, { ...offFlags, kakao: true });
  const none = loadPayloadMemberConfig(member);
  assert.deepEqual(configuredMemberCapabilities(none), {
    ...offFlags,
    apple: false,
    google: false
  });
});

test("social callbacks map to their own policy path; unknown ids stay unmapped", () => {
  for (const id of ["google", "apple", "kakao"])
    assert.equal(memberAuthPath("/callback/:id", { id }), `/callback/${id}`);
  assert.equal(
    memberAuthPath("/callback/:id", { id: "github" }),
    "/callback/:id"
  );
});

test("sign-in, linking and callbacks accept only enabled providers", () => {
  const enabled = ["apple", "google"] as const;
  for (const provider of enabled) {
    assert.doesNotThrow(() =>
      assertPayloadAuthRequest(
        origin,
        "/sign-in/social",
        { provider, callbackURL: "/account" },
        undefined,
        enabled
      )
    );
    assert.doesNotThrow(() =>
      assertPayloadAuthRequest(
        origin,
        "/sign-in/social",
        { provider, callbackURL: "/tickets" },
        undefined,
        enabled
      )
    );
    assert.doesNotThrow(() =>
      assertPayloadAuthRequest(
        origin,
        `/callback/${provider}`,
        undefined,
        new URLSearchParams({ state: "s", code: "c" }),
        enabled
      )
    );
  }
  assert.throws(() =>
    assertPayloadAuthRequest(
      origin,
      "/sign-in/social",
      { provider: "kakao", callbackURL: "/account" },
      undefined,
      enabled
    )
  );
  assert.throws(() =>
    assertPayloadAuthRequest(
      origin,
      "/link-social",
      { provider: "kakao", callbackURL: "/account" },
      undefined,
      enabled
    )
  );
  assert.throws(() =>
    assertPayloadAuthRequest(
      origin,
      "/callback/kakao",
      undefined,
      new URLSearchParams({ state: "s", code: "c" }),
      enabled
    )
  );
  assert.throws(() =>
    assertPayloadAuthRequest(
      origin,
      "/callback/:id",
      undefined,
      undefined,
      enabled
    )
  );
  assert.throws(() =>
    assertPayloadAuthRequest(
      origin,
      "/sign-in/social",
      { provider: "github", callbackURL: "/account" },
      undefined,
      enabled
    )
  );
  assert.doesNotThrow(() =>
    assertPayloadAuthRequest(
      origin,
      "/sign-in/social",
      { provider: "kakao", callbackURL: "/account" },
      undefined,
      [...enabled, "kakao"]
    )
  );
});

test("the before hook refuses a switched-off Kakao callback and sign-in", async () => {
  const before = createPayloadAuthBefore(origin, ["apple", "google"]);
  await assert.rejects(
    before({
      path: "/callback/:id",
      params: { id: "kakao" },
      query: { state: "s", code: "c" },
      headers: new Headers(),
      context: {}
    } as never),
    { statusCode: 403 }
  );
  await assert.rejects(
    before({
      path: "/sign-in/social",
      body: { provider: "kakao", callbackURL: "/account" },
      headers: new Headers(),
      context: {}
    } as never),
    { statusCode: 403 }
  );
});
