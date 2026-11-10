import { EnglishMessages } from "../fixtures/english-messages";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createPasswordlessLoginSession,
  loginAttemptSchema,
  normalizeLoginEmail,
  type PasswordlessLoginClient
} from "@/lib/passwordless-login";
import { PasswordlessLoginView } from "@/components/Authentication/phone-verification/passwordless-login";

function fixture(overrides: Partial<PasswordlessLoginClient> = {}) {
  const calls: string[] = [];
  const client: PasswordlessLoginClient = {
    begin: async (email) => {
      calls.push(`begin:${email}`);
      return { id: "opaque-flow", methods: ["passkey", "otp"] };
    },
    passkey: async (id) => {
      calls.push(`passkey:${id}`);
      return "cancelled";
    },
    requestOtp: async (id) => {
      calls.push(`otp:${id}`);
    },
    google: async () => {
      calls.push("google");
    },
    ...overrides
  };
  const snapshots: unknown[] = [];
  const session = createPasswordlessLoginSession(client, (snapshot) =>
    snapshots.push(snapshot)
  );
  return { session, calls, snapshots };
}

test("email normalization trims but preserves the local part and rejects malformed or oversized email", () => {
  assert.equal(
    normalizeLoginEmail("  Member@example.com  "),
    "Member@example.com"
  );
  assert.equal(normalizeLoginEmail("bad"), null);
  assert.equal(normalizeLoginEmail("a@example.com\r\nBcc:x@y.com"), null);
  assert.equal(normalizeLoginEmail(`${"a".repeat(250)}@example.com`), null);
});

test("attempts are opaque bounded identifiers with only supported nonempty methods", () => {
  assert.equal(
    loginAttemptSchema.safeParse({ id: "flow_123", methods: ["otp"] }).success,
    true
  );
  for (const value of [
    { id: "../../other", methods: ["otp"] },
    { id: "flow", methods: [] },
    { id: "flow", methods: ["password"] },
    { id: "flow", methods: ["otp", "otp"] }
  ]) {
    assert.equal(loginAttemptSchema.safeParse(value).success, false);
  }
});

test("default adapter fails closed and invalid email never attempts account lookup", async () => {
  const session = createPasswordlessLoginSession(undefined, () => {});
  session.setEmail("invalid");
  await session.begin();
  assert.equal(session.snapshot().error, "invalidEmail");
  session.setEmail("member@example.com");
  await session.begin();
  assert.equal(session.snapshot().error, "unavailable");
  assert.equal(session.snapshot().attempt, null);
  assert.notEqual(session.snapshot().status, "authenticated");
});

test("eligible passkey is automatically attempted exactly once and cancellation exposes explicit choices", async () => {
  const { session, calls } = fixture();
  session.setEmail("member@example.com");
  await session.begin();
  assert.deepEqual(calls, ["begin:member@example.com", "passkey:opaque-flow"]);
  assert.equal(session.snapshot().status, "choice");
  assert.equal(session.snapshot().error, "passkeyCancelled");
  assert.equal(session.snapshot().email, "member@example.com");
  await session.requestOtp();
  assert.equal(session.snapshot().status, "otp");
  assert.deepEqual(calls, [
    "begin:member@example.com",
    "passkey:opaque-flow",
    "otp:opaque-flow"
  ]);
});

test("OTP-only attempts never launch passkeys and explicit retry is not automatic", async () => {
  const { session, calls } = fixture({
    begin: async () => ({ id: "email-flow", methods: ["otp"] })
  });
  session.setEmail("member@example.com");
  await session.begin();
  await session.retryPasskey();
  assert.deepEqual(calls, []);
  assert.equal(session.snapshot().status, "choice");
});

test("server-confirmed passkey authentication is distinct from cancelled or invalid responses", async () => {
  const { session } = fixture({ passkey: async () => "authenticated" });
  session.setEmail("member@example.com");
  await session.begin();
  assert.equal(session.snapshot().status, "authenticated");
  const malformed = fixture({
    begin: async () => ({ id: "flow", methods: ["password"] }) as never
  });
  malformed.session.setEmail("member@example.com");
  await malformed.session.begin();
  assert.equal(malformed.session.snapshot().error, "requestFailed");
  assert.equal(malformed.session.snapshot().attempt, null);
});

test("editing email aborts an old lookup and ignores its late result", async () => {
  let release!: (value: { id: string; methods: ["otp"] }) => void;
  let signal: AbortSignal | undefined;
  const { session } = fixture({
    begin: async (_email, currentSignal) => {
      signal = currentSignal;
      return new Promise((resolve) => {
        release = resolve;
      });
    }
  });
  session.setEmail("first@example.com");
  const pending = session.begin();
  session.setEmail("second@example.com");
  assert.equal(signal?.aborted, true);
  release({ id: "old-flow", methods: ["otp"] });
  await pending;
  assert.equal(session.snapshot().email, "second@example.com");
  assert.equal(session.snapshot().attempt, null);
  assert.equal(session.snapshot().status, "email");
});

test("duplicate submissions are guarded and disposal aborts work without late notifications", async () => {
  let release!: (value: { id: string; methods: ["otp"] }) => void;
  let calls = 0;
  const { session, snapshots } = fixture({
    begin: async () => {
      calls += 1;
      return new Promise((resolve) => {
        release = resolve;
      });
    }
  });
  session.setEmail("member@example.com");
  const first = session.begin();
  await session.begin();
  assert.equal(calls, 1);
  session.dispose();
  const count = snapshots.length;
  release({ id: "late-flow", methods: ["otp"] });
  await first;
  assert.equal(snapshots.length, count);
});

test("Google operation never infers an authenticated session from starting a redirect", async () => {
  const { session, calls } = fixture();
  await session.google();
  assert.deepEqual(calls, ["google"]);
  assert.equal(session.snapshot().status, "email");
  assert.notEqual(session.snapshot().status, "authenticated");
});

test("a disposed lookup cannot launch a passkey prompt from its late eligible result", async () => {
  let release!: (value: { id: string; methods: ["passkey", "otp"] }) => void;
  let passkeyCalls = 0;
  let signal: AbortSignal | undefined;
  const { session, snapshots } = fixture({
    begin: async (_email, currentSignal) => {
      signal = currentSignal;
      return new Promise(resolve => { release = resolve; });
    },
    passkey: async () => { passkeyCalls += 1; return "authenticated"; },
  });
  session.setEmail("member@example.com");
  const pending = session.begin();
  session.dispose();
  const notifications = snapshots.length;
  assert.equal(signal?.aborted, true);
  release({ id: "late-eligible-flow", methods: ["passkey", "otp"] });
  await pending;
  assert.equal(passkeyCalls, 0);
  assert.equal(snapshots.length, notifications);
  assert.notEqual(session.snapshot().status, "authenticated");
});

test("passkey retry is explicit and a failed OTP request preserves the available choices", async () => {
  let attempts = 0;
  const { session, calls } = fixture({
    passkey: async () => { attempts += 1; return attempts === 1 ? "cancelled" : "authenticated"; },
    requestOtp: async () => { throw new Error("Provider unavailable"); },
  });
  session.setEmail("member@example.com");
  await session.requestOtp();
  assert.equal(calls.length, 0, "OTP cannot start before a validated attempt");
  await session.begin();
  assert.equal(attempts, 1);
  await session.requestOtp();
  assert.equal(session.snapshot().status, "choice");
  assert.equal(session.snapshot().error, "requestFailed");
  await session.retryPasskey();
  assert.equal(attempts, 2);
  assert.equal(session.snapshot().status, "authenticated");
  await session.retryPasskey();
  await session.requestOtp();
  assert.equal(attempts, 2, "a completed sign-in must not launch more authentication");
});

test("initial English and Korean presenter has email and Google but no password, passkey or pretend account result", () => {
  for (const locale of ["en", "ko"] as const) {
    const html = renderToStaticMarkup(
      <EnglishMessages><PasswordlessLoginView headingId="login-heading" locale={locale} /></EnglishMessages>
    );
    assert.match(html, /type="email"/);
    assert.match(html, /autocomplete="email"/i);
    assert.doesNotMatch(
      html,
      /type="password"|autocomplete="current-password"/
    );
    assert.doesNotMatch(html, /data-login-passkey/);
    assert.match(html, /data-login-google=""[^>]*disabled=""/);
    assert.match(html, /data-login-unavailable/);
    assert.match(html, /id="login-heading"/);
  }
});
