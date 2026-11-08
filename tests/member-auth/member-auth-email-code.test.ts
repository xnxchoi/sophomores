import assert from "node:assert/strict";
import { test } from "node:test";
import { memoryAdapter } from "better-auth/adapters/memory";
import type { EmailOTPOptions } from "better-auth/plugins";
import type { Pool } from "pg";
import { assertMemberAuthRequest, createMemberAuth } from "@/lib/member-auth/server";
import type { MemberAuthConfig } from "@/lib/member-auth/config";
import type { MemberMailNotification } from "@/lib/member-auth/mail";

// Exercise production hooks/plugins with the installed library's memory adapter.
// No database connection, SMTP transport, custom generator or OTP verifier.
function fixture() {
  const config: MemberAuthConfig = {
    mode: "local", origin: "http://localhost:3240",
    databaseUrl: "postgres://localhost/sophomores_verification_test",
    secret: "b".repeat(64), verificationSecret: "a".repeat(64), rpId: "localhost", google: null,
    mail: { host: "smtp.zeptomail.com", port: 465, username: "fixture", password: "fixture", from: "auth@fixture.invalid" }
  };
  const notifications: MemberMailNotification[] = [];
  const database: Record<string, Record<string, unknown>[]> = {
    user: [], session: [], account: [], verification: [], rateLimit: [], passkey: []
  };
  const production = createMemberAuth(config, {
    pool: memoryAdapter(database) as unknown as Pool, isActiveMember: async () => false,
    sendMail: async (notification) => { notifications.push(notification); }
  });
  const auth = production;
  const request = (path: string, body: Record<string, unknown>) => auth.handler(new Request(`${config.origin}/api/auth${path}`, {
    method: "POST", headers: { host: "localhost:3240", origin: config.origin, "content-type": "application/json", "x-member-local-ip": "127.0.0.1" },
    body: JSON.stringify(body)
  }));
  const send = async () => {
    assert.equal((await request("/email-otp/send-verification-otp", { email: "member@fixture.invalid", type: "sign-in" })).status, 200);
    const mail = notifications.at(-1);
    assert.ok(mail?.type === "email-otp");
    return mail.otp;
  };
  return { config, auth, production, database, request, send };
}

test("production OTP uses native six-character uppercase generation without weakening security settings", () => {
  const { production } = fixture();
  const plugin = production.options.plugins!.find((value) => value.id === "email-otp")!;
  const options = plugin.options as EmailOTPOptions;
  assert.equal(options.otpLength, 6);
  assert.equal(options.expiresIn, 300);
  assert.equal(options.allowedAttempts, 3);
  assert.equal(options.storeOTP, "hashed");
  assert.deepEqual(options.rateLimit, { window: 60, max: 3 });
  assert.ok(options.generateOTP);
  for (let index = 0; index < 128; index++) {
    const code: string | undefined = options.generateOTP({ email: "member@fixture.invalid", type: "sign-in" });
    assert.equal(code?.length, 6);
    assert.match(code!, /^[A-Z0-9]{6}$/);
  }
});

test("real OTP handler hashes the code, accepts lowercase, verifies email and blocks replay", async () => {
  const { request, send, database } = fixture();
  const code = await send();
  assert.equal(code.length, 6);
  assert.match(code, /^[A-Z0-9]{6}$/);
  assert.ok(database.verification.length > 0);
  assert.ok(database.verification.every((row) => !String(row.value).includes(code)));
  const response = await request("/sign-in/email-otp", { email: "member@fixture.invalid", otp: code.toLowerCase() });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.emailVerified, true);
  assert.ok(response.headers.getSetCookie().some((cookie) => /sophomores-member\.session_token=.*HttpOnly/i.test(cookie)));
  assert.notEqual((await request("/sign-in/email-otp", { email: "member@fixture.invalid", otp: code })).status, 200);
});

test("raw OTP requests reject old, malformed and Unicode codes before consuming the valid challenge", async () => {
  const { config, request, send } = fixture();
  const code = await send();
  for (const otp of ["12345678", "A1B2C", "A1B2C3D", "A1 B2C", "A1B2C3\n", "Ａ1B2C3", "ß1B2C3", "A1B2C!", null, 123456]) {
    assert.throws(() => assertMemberAuthRequest(config, "/sign-in/email-otp", { email: "member@fixture.invalid", otp }));
  }
  assert.equal((await request("/sign-in/email-otp", { email: "member@fixture.invalid", otp: "A1B2C3\n" })).status, 403);
  assert.equal((await request("/sign-in/email-otp", { email: "member@fixture.invalid", otp: code })).status, 200);
});

test("expired OTP cannot create a session", async () => {
  const { auth, request, send, database } = fixture();
  const code = await send();
  const context = await auth.$context;
  await context.internalAdapter.updateVerificationByIdentifier(String(database.verification[0].identifier), { expiresAt: new Date(0) });
  const response = await request("/sign-in/email-otp", { email: "member@fixture.invalid", otp: code });
  assert.notEqual(response.status, 200);
  assert.equal(database.session.length, 0);
});

test("three wrong OTP attempts exhaust the challenge", async () => {
  const { request, send } = fixture();
  const code = await send();
  const wrong = code === "000000" ? "111111" : "000000";
  for (let index = 0; index < 3; index++) {
    assert.notEqual((await request("/sign-in/email-otp", { email: "member@fixture.invalid", otp: wrong })).status, 200);
  }
  assert.notEqual((await request("/sign-in/email-otp", { email: "member@fixture.invalid", otp: code })).status, 200);
});

test("new deliveries use the current code format and the resend rate limit still applies", async () => {
  const { request, send } = fixture();
  const first = await send();
  const second = await send();
  assert.equal(first.length, 6);
  assert.match(second, /^[A-Z0-9]{6}$/);
  await send();
  assert.equal((await request("/email-otp/send-verification-otp", { email: "member@fixture.invalid", type: "sign-in" })).status, 429);
});
