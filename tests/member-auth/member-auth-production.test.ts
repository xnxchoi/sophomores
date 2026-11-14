import assert from "node:assert/strict";
import { test } from "node:test";
import { Pool } from "pg";
import { getCookies } from "better-auth/cookies";
import { loadMemberAuthConfig } from "@/lib/member-auth/config";
import { loadPayloadMemberConfig } from "@/lib/member-auth/payload-config";
import { createMemberAuth } from "@/lib/member-auth/server";
import { createMemberHandlers } from "@/lib/member-auth/http";
import { createPhoneIdentifierHandlers } from "@/lib/member-auth/identifier-http";
import { PgPhoneIdentifier } from "@/lib/member-auth/identifier";
import { createMemberMailer } from "@/lib/member-auth/mail";
import { loadPhoneVerificationConfig } from "@/lib/phone-verification/server/config";
import {
  createPhoneVerificationHandlers,
  SESSION_COOKIE
} from "@/lib/phone-verification/server/http";
import {
  hasConfiguredRequestAuthority,
  hasLocalRequestAuthority
} from "@/lib/phone-verification/server/local-request";

const origin = "https://sophomores.co";
const database =
  "postgresql://app:private@db.example.internal:5432/sophomores?sslmode=require";
const production = {
  MEMBER_AUTH_MODE: "production",
  MEMBER_AUTH_ORIGIN: origin,
  MEMBER_AUTH_DATABASE_URL: database,
  MEMBER_AUTH_SECRET: "b".repeat(64),
  PHONE_VERIFICATION_MODE: "production",
  PHONE_VERIFICATION_TRANSPORT: "zoho-poll",
  PHONE_VERIFICATION_ORIGIN: origin,
  PHONE_VERIFICATION_DATABASE_URL: database,
  PHONE_VERIFICATION_STATE_SECRET: "a".repeat(64),
  PHONE_VERIFICATION_RECIPIENT: "verify@sophomores.co",
  PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: "12345"
};
const memberError =
  /^Error: Member authentication needs a valid private local configuration\.$/;

test("production phone verification accepts the https origin and rejects every other shape", () => {
  const config = loadPhoneVerificationConfig(production)!;
  assert.equal(config.origin, origin);
  assert.equal(config.databaseUrl, database);
  for (const change of [
    { PHONE_VERIFICATION_ORIGIN: "http://sophomores.co" },
    { PHONE_VERIFICATION_ORIGIN: "https://sophomores.co:8443" },
    { PHONE_VERIFICATION_ORIGIN: "https://sophomores.co/path" },
    { PHONE_VERIFICATION_ORIGIN: "https://sophomores.co?x=1" },
    { PHONE_VERIFICATION_ORIGIN: "https://sophomores.co#x" },
    { PHONE_VERIFICATION_ORIGIN: "https://user:pass@sophomores.co" },
    { PHONE_VERIFICATION_ORIGIN: "https://localhost" },
    { PHONE_VERIFICATION_ORIGIN: "https://127.0.0.1" },
    { PHONE_VERIFICATION_ORIGIN: "" },
    { PHONE_VERIFICATION_STATE_SECRET: "short" },
    { PHONE_VERIFICATION_RECIPIENT: "not-an-address" },
    { PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: "0" },
    { PHONE_VERIFICATION_TRANSPORT: "other" }
  ])
    assert.throws(
      () => loadPhoneVerificationConfig({ ...production, ...change }),
      /^Error: Invalid local phone verification configuration$/
    );
});

test("production databases require TLS or a private network and no other parameters", () => {
  const accept = (url: string) =>
    loadPhoneVerificationConfig({
      ...production,
      PHONE_VERIFICATION_DATABASE_URL: url
    })!.databaseUrl;
  for (const url of [
    "postgresql://app@db.example.com:5432/sophomores?sslmode=verify-full",
    "postgresql://app@db.example.com/sophomores?sslmode=verify-ca",
    "postgresql://app@postgres:5432/sophomores",
    "postgresql://app@10.0.0.5:5432/sophomores",
    "postgresql://app@172.20.1.2/sophomores",
    "postgresql://app@192.168.1.9/sophomores"
  ])
    assert.equal(accept(url), new URL(url).href);
  for (const url of [
    "postgresql://app@db.example.com:5432/sophomores",
    "postgresql://app@db.example.com/sophomores?sslmode=disable",
    "postgresql://app@db.example.com/sophomores?sslmode=prefer",
    "postgresql://app@db.example.com/sophomores?sslmode=require&options=-csearch_path%3Dx",
    "postgresql://app@db.example.com/sophomores?application_name=x",
    "postgresql://app@172.32.0.1/sophomores",
    "postgresql://app@8.8.8.8/sophomores",
    "postgresql://app@db.example.com/sophomores?sslmode=require#x",
    "postgresql://app@db.example.com/",
    "mysql://app@db.example.com/sophomores?sslmode=require"
  ])
    assert.throws(
      () => accept(url),
      /^Error: Invalid local phone verification configuration$/
    );
});

test("phone verification modes never cross: production requires production and local stays local", () => {
  assert.throws(() =>
    loadPhoneVerificationConfig({
      ...production,
      PHONE_VERIFICATION_MODE: "local"
    })
  );
  assert.throws(() =>
    loadPhoneVerificationConfig({
      ...production,
      PHONE_VERIFICATION_MODE: "prod"
    })
  );
  assert.equal(
    loadPhoneVerificationConfig({ PHONE_VERIFICATION_MODE: "disabled" }),
    null
  );
});

test("production member auth accepts https://sophomores.co and derives its relying-party id", () => {
  const config = loadMemberAuthConfig(production)!;
  assert.equal(config.mode, "production");
  assert.equal(config.origin, origin);
  assert.equal(config.rpId, "sophomores.co");
  assert.equal(config.databaseUrl, database);
  assert.equal(
    config.verificationSecret,
    production.PHONE_VERIFICATION_STATE_SECRET
  );
  assert.equal(Object.isFrozen(config), true);
});

test("production member auth fails fast on http, ports, paths, mismatches and missing or shared secrets", () => {
  for (const change of [
    { MEMBER_AUTH_ORIGIN: "http://sophomores.co" },
    { MEMBER_AUTH_ORIGIN: "https://sophomores.co:8443" },
    { MEMBER_AUTH_ORIGIN: "https://sophomores.co/path" },
    { MEMBER_AUTH_ORIGIN: "https://sophomores.co?x=1" },
    { MEMBER_AUTH_ORIGIN: "https://sophomores.co#x" },
    { MEMBER_AUTH_ORIGIN: "https://user:pass@sophomores.co" },
    { MEMBER_AUTH_ORIGIN: "https://www.sophomores.co" },
    { MEMBER_AUTH_ORIGIN: "https://localhost" },
    { MEMBER_AUTH_ORIGIN: undefined },
    { PHONE_VERIFICATION_ORIGIN: "https://www.sophomores.co" },
    {
      PHONE_VERIFICATION_MODE: "local",
      PHONE_VERIFICATION_ORIGIN: "http://localhost:3240"
    },
    { PHONE_VERIFICATION_MODE: "disabled" },
    {
      MEMBER_AUTH_DATABASE_URL:
        "postgresql://app:private@db.example.internal:5432/other?sslmode=require"
    },
    {
      MEMBER_AUTH_DATABASE_URL:
        "postgresql://app:private@db.example.com:5432/sophomores"
    },
    { MEMBER_AUTH_DATABASE_URL: undefined },
    { MEMBER_AUTH_SECRET: undefined },
    { MEMBER_AUTH_SECRET: "short" },
    { MEMBER_AUTH_SECRET: production.PHONE_VERIFICATION_STATE_SECRET },
    { PHONE_VERIFICATION_STATE_SECRET: undefined }
  ])
    assert.throws(
      () => loadMemberAuthConfig({ ...production, ...change }),
      memberError
    );
  assert.throws(
    () => loadMemberAuthConfig({ ...production, MEMBER_AUTH_MODE: "staging" }),
    memberError
  );
});

test("local member auth cannot borrow production origins or databases", () => {
  const local = {
    ...production,
    MEMBER_AUTH_MODE: "local",
    MEMBER_AUTH_ORIGIN: "http://localhost:3240",
    PHONE_VERIFICATION_MODE: "local",
    PHONE_VERIFICATION_ORIGIN: "http://localhost:3240",
    MEMBER_AUTH_DATABASE_URL:
      "postgres://fixture:private@127.0.0.1:5432/sophomores_verification_test_auth",
    PHONE_VERIFICATION_DATABASE_URL:
      "postgres://fixture:private@127.0.0.1:5432/sophomores_verification_test_auth"
  };
  assert.equal(loadMemberAuthConfig(local)!.rpId, "localhost");
  assert.throws(
    () =>
      loadMemberAuthConfig({
        ...local,
        MEMBER_AUTH_ORIGIN: origin,
        PHONE_VERIFICATION_ORIGIN: origin
      }),
    memberError
  );
  assert.throws(
    () =>
      loadMemberAuthConfig({
        ...local,
        MEMBER_AUTH_DATABASE_URL: database,
        PHONE_VERIFICATION_DATABASE_URL: database
      }),
    memberError
  );
});

test("production canonical membership requires the resolved site URL to be the configured origin", () => {
  const payload = {
    ...production,
    DATABASE_URI: database,
    PAYLOAD_SECRET: "c".repeat(64),
    NEXT_PUBLIC_SERVER_URL: origin
  };
  const config = loadPayloadMemberConfig(payload)!;
  assert.equal(config.origin, origin);
  assert.equal(config.databaseUrl, database);
  assert.equal(
    loadPayloadMemberConfig({
      ...payload,
      NEXT_PUBLIC_SERVER_URL: `${origin}/`
    })!.origin,
    origin
  );
  assert.equal(
    loadPayloadMemberConfig({
      ...payload,
      NEXT_PUBLIC_SERVER_URL: undefined,
      BETTER_AUTH_URL: origin
    })!.origin,
    origin
  );
  for (const change of [
    { NEXT_PUBLIC_SERVER_URL: undefined },
    { NEXT_PUBLIC_SERVER_URL: "https://www.sophomores.co" },
    { NEXT_PUBLIC_SERVER_URL: "http://localhost:3000" },
    { MEMBER_AUTH_ORIGIN: "http://sophomores.co" },
    { MEMBER_AUTH_ORIGIN: "https://sophomores.co:8443" },
    {
      DATABASE_URI:
        "postgresql://app:private@db.example.internal:5432/other?sslmode=require"
    },
    { DATABASE_URI: "postgresql://app:private@db.example.com:5432/sophomores" },
    { PAYLOAD_SECRET: "short" },
    { PAYLOAD_SECRET: production.PHONE_VERIFICATION_STATE_SECRET },
    { PHONE_VERIFICATION_MODE: "local" }
  ])
    assert.throws(
      () => loadPayloadMemberConfig({ ...payload, ...change }),
      /^Error: Canonical membership requires matching private local database and verification settings\.$/
    );
});

function request(
  path: string,
  init: {
    url?: string;
    headers?: Record<string, string>;
    method?: string;
    body?: unknown;
  } = {}
) {
  return new Request(`${init.url ?? origin}${path}`, {
    method: init.method ?? "GET",
    headers: { Host: "sophomores.co", ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body)
  });
}

test("configured authority accepts only the exact production origin and keeps local rules for http", () => {
  assert.equal(hasConfiguredRequestAuthority(request("/x"), origin), true);
  assert.equal(
    hasConfiguredRequestAuthority(new Request(`${origin}/x`), origin),
    true
  );
  for (const bad of [
    request("/x", {
      url: "https://evil.example",
      headers: { Host: "evil.example" }
    }),
    request("/x", { url: "http://sophomores.co" }),
    request("/x", { url: "https://www.sophomores.co" }),
    request("/x", { url: "https://sophomores.co:8443" }),
    request("/x", { headers: { Host: "evil.example" } }),
    request("/x", {
      url: "http://localhost:3000",
      headers: { Host: "localhost:3000" }
    })
  ])
    assert.equal(hasConfiguredRequestAuthority(bad, origin), false);
  const local = new Request("http://127.0.0.1:3000/x", {
    headers: { Host: "localhost:3000" }
  });
  assert.equal(
    hasConfiguredRequestAuthority(local, "http://localhost:3000"),
    hasLocalRequestAuthority(local, "http://localhost:3000")
  );
  assert.equal(
    hasConfiguredRequestAuthority(request("/x"), "http://localhost:3000"),
    false
  );
  // The shared local-only helper is unchanged for callers that never branch on protocol.
  assert.equal(hasLocalRequestAuthority(request("/x"), origin), false);
});

test("member status accepts the production origin and rejects localhost and foreign origins", async () => {
  const handlers = createMemberHandlers({
    production: true,
    origin,
    capabilities: {
      emailOtp: false,
      magicLink: false,
      google: false,
      passkey: true
    },
    resolvePrincipal: async () => null,
    service: {
      bind: async () => ({ phoneBound: true, member: true }),
      status: async () => ({
        authenticated: false,
        phoneBindingAuth: "anonymous" as const,
        emailVerified: false,
        phoneBound: false,
        member: false
      })
    }
  });
  assert.equal(
    (await handlers.status(request("/api/member/status"))).status,
    200
  );
  for (const rejected of [
    request("/api/member/status", {
      url: "http://localhost:3000",
      headers: { Host: "localhost:3000" }
    }),
    request("/api/member/status", {
      url: "https://evil.example",
      headers: { Host: "evil.example" }
    }),
    request("/api/member/status", { headers: { Host: "evil.example" } }),
    request("/api/member/status", {
      headers: { "sec-fetch-site": "cross-site" }
    })
  ])
    assert.equal((await handlers.status(rejected)).status, 403);
  const token = "a".repeat(43);
  const post = (headers: Record<string, string>, url?: string) =>
    request("/api/phone-verification/bind", {
      method: "POST",
      url,
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE}=${token}`,
        ...headers
      },
      body: {
        challengeId: "069a74b7-17a2-4368-b3a2-60298eb1bd6a",
        phone: "01012345678"
      }
    });
  const bindable = createMemberHandlers({
    production: true,
    origin,
    capabilities: {
      emailOtp: false,
      magicLink: false,
      google: false,
      passkey: true
    },
    resolvePrincipal: async () => ({
      userId: "member",
      emailVerified: true,
      sessionCreatedAt: new Date()
    }),
    service: {
      bind: async () => ({ phoneBound: true, member: true }),
      status: async () => {
        throw new Error("unused");
      }
    }
  });
  assert.equal((await bindable.bind(post({ origin }))).status, 200);
  assert.equal(
    (await bindable.bind(post({ origin: "http://localhost:3000" }))).status,
    403
  );
  assert.equal(
    (await bindable.bind(post({ origin: "https://evil.example" }))).status,
    403
  );
});

test("member HTTP construction accepts a production origin, keeps local rules and rejects other public origins", () => {
  const dependencies: Omit<
    Parameters<typeof createMemberHandlers>[0],
    "origin"
  > = {
    capabilities: {
      emailOtp: false,
      magicLink: false,
      google: false,
      passkey: true
    },
    resolvePrincipal: async () => null,
    service: {
      bind: async () => ({ phoneBound: true, member: true }),
      status: async () => ({
        authenticated: false,
        phoneBindingAuth: "anonymous" as const,
        emailVerified: false,
        phoneBound: false,
        member: false
      })
    }
  };
  assert.doesNotThrow(() =>
    createMemberHandlers({ ...dependencies, origin, production: true })
  );
  // Production is an explicit opt-in; without it a public https origin is still rejected.
  assert.throws(
    () => createMemberHandlers({ ...dependencies, origin }),
    /^Error: Local member origin required$/
  );
  assert.throws(
    () =>
      createMemberHandlers({
        ...dependencies,
        origin: "http://localhost:3000",
        production: true
      }),
    /^Error: Local member origin required$/
  );
  assert.doesNotThrow(() =>
    createMemberHandlers({ ...dependencies, origin: "http://localhost:3000" })
  );
  for (const bad of [
    "http://sophomores.co",
    "https://sophomores.co:8443",
    "https://sophomores.co/",
    "https://localhost",
    "http://evil.example"
  ])
    assert.throws(
      () =>
        createMemberHandlers({ ...dependencies, origin: bad, production: true }),
      /^Error: Local member origin required$/
    );
});

test("phone identifier and phone verification routes apply the configured production origin", async () => {
  const token = "a".repeat(43);
  const identifier = createPhoneIdentifierHandlers({
    origin,
    identifier: { start: async () => ({ token }), clear: async () => undefined }
  });
  const identify = (headers: Record<string, string>, url?: string) =>
    request("/api/member/identify", {
      method: "POST",
      url,
      headers: { "content-type": "application/json", origin, ...headers },
      body: { phone: "01012345678" }
    });
  assert.equal((await identifier.start(identify({}))).status, 200);
  assert.equal(
    (await identifier.start(identify({ origin: "http://localhost:3000" })))
      .status,
    403
  );
  assert.equal(
    (await identifier.start(identify({}, "http://localhost:3000"))).status,
    403
  );
  const phone = createPhoneVerificationHandlers({
    origin,
    webhookSecret: "fixture",
    mailboxId: "100",
    zohoUserId: "101",
    zohoIntegrationId: "102",
    service: {
      issue: async () => ({ id: "challenge" }),
      status: async () => ({
        id: "challenge",
        state: "verified",
        expiresAt: new Date().toISOString(),
        mode: "local"
      }),
      cancel: async () => undefined
    } as never,
    deliveries: { enqueueDelivery: async () => undefined } as never
  });
  const issue = (headers: Record<string, string>, url?: string) =>
    request("/api/phone-verification/challenges", {
      method: "POST",
      url,
      headers: { "content-type": "application/json", origin, ...headers },
      body: { phone: "01012345678" }
    });
  assert.equal((await phone.issue(issue({}))).status, 201);
  assert.equal(
    (await phone.issue(issue({ origin: "https://evil.example" }))).status,
    403
  );
  assert.equal(
    (await phone.issue(issue({}, "http://localhost:3000"))).status,
    403
  );
});

test("the phone identifier and mailer accept the production origin and stay strict otherwise", () => {
  const pool = {} as unknown as Pool;
  const options = {
    origin,
    secret: "b".repeat(64),
    verificationSecret: "a".repeat(64)
  };
  assert.doesNotThrow(
    () => new PgPhoneIdentifier(pool, { ...options, production: true })
  );
  assert.doesNotThrow(
    () =>
      new PgPhoneIdentifier(pool, {
        ...options,
        origin: "http://localhost:3000"
      })
  );
  // Production origins are an explicit opt-in; the default stays loopback-only.
  assert.throws(() => new PgPhoneIdentifier(pool, options));
  for (const bad of [
    "http://sophomores.co",
    "https://sophomores.co:8443",
    "https://localhost",
    "http://127.0.0.1:3000",
    "https://evil.example/"
  ])
    assert.throws(
      () =>
        new PgPhoneIdentifier(pool, {
          ...options,
          origin: bad,
          production: true
        })
    );
  assert.throws(
    () =>
      new PgPhoneIdentifier(pool, {
        ...options,
        origin: "http://localhost:3000",
        production: true
      })
  );
  assert.doesNotThrow(() =>
    createMemberMailer(null, origin, { production: true })
  );
  assert.doesNotThrow(() => createMemberMailer(null, "http://localhost:3000"));
  assert.throws(
    () => createMemberMailer(null, origin),
    /^Error: Member email configuration is invalid\.$/
  );
  assert.throws(
    () =>
      createMemberMailer(null, "http://localhost:3000", { production: true }),
    /^Error: Member email configuration is invalid\.$/
  );
  for (const bad of [
    "http://sophomores.co",
    "https://sophomores.co:8443",
    "https://sophomores.co/path",
    "https://localhost"
  ])
    assert.throws(
      () => createMemberMailer(null, bad, { production: true }),
      /^Error: Member email configuration is invalid\.$/
    );
});

const unusedPool = {
  connect: async () => {
    throw new Error("Database access is forbidden in this test");
  }
} as unknown as Pool;
const noop = {
  isActiveMember: async () => false,
  sendMail: async () => undefined
};

test("production member auth uses the configured base URL, trusted origin, relying party and Secure cookies", async () => {
  const config = loadMemberAuthConfig(production)!;
  const auth = createMemberAuth(config, { pool: unusedPool, ...noop });
  await auth.$context;
  assert.equal(auth.options.baseURL, origin);
  assert.deepEqual(auth.options.trustedOrigins, [origin]);
  assert.equal(auth.options.advanced?.useSecureCookies, true);
  const cookies = getCookies(auth.options);
  assert.match(cookies.sessionToken.name, /^__Secure-sophomores-member\./);
  assert.equal(cookies.sessionToken.attributes.secure, true);
  assert.equal(cookies.sessionToken.attributes.httpOnly, true);
});

test("local member auth keeps its non-Secure loopback cookies", async () => {
  const config = {
    ...loadMemberAuthConfig(production)!,
    mode: "local" as const,
    origin: "http://localhost:3240",
    rpId: "localhost" as const
  };
  const auth = createMemberAuth(config, { pool: unusedPool, ...noop });
  await auth.$context;
  assert.equal(auth.options.advanced?.useSecureCookies, false);
  assert.equal(getCookies(auth.options).sessionToken.attributes.secure, false);
});

test("the canonical Better Auth options take base URL, trusted origins and Secure cookies from the production origin", async () => {
  process.env.NEXT_PUBLIC_SERVER_URL = `${origin}/`;
  const { betterAuthOptions } = await import("@/lib/auth/options");
  assert.equal(betterAuthOptions.baseURL, origin);
  assert.deepEqual(betterAuthOptions.trustedOrigins, [origin]);
  assert.equal(betterAuthOptions.advanced.useSecureCookies, true);
  const cookies = getCookies(betterAuthOptions as never);
  assert.match(cookies.sessionToken.name, /^__Secure-/);
  assert.equal(cookies.sessionToken.attributes.secure, true);
});
