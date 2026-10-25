import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Pool } from "pg";
import { getMigrations } from "better-auth/db/migration";
import { createMemberAuth } from "../lib/member-auth/server";
import type { MemberAuthConfig } from "../lib/member-auth/config";
import type { MemberMailNotification } from "../lib/member-auth/mail";

const database = process.env.MEMBER_AUTH_TEST_DATABASE_URL;
if (database) {
  const url = new URL(database);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
    || !/^\/sophomores_verification_test(?:_[a-z0-9_]+)?$/.test(url.pathname) || url.search || url.hash)
    throw new Error("Member auth tests require a separate disposable local test database.");
}
const pool = database ? new Pool({ connectionString: database, options: "-c search_path=member_auth_server_test" }) : null;
const notifications: MemberMailNotification[] = [];
const config: MemberAuthConfig = {
  mode: "local", origin: "http://localhost:3240", databaseUrl: database ?? "postgres://localhost/sophomores_verification_test",
  secret: "b".repeat(64), verificationSecret: "a".repeat(64), rpId: "localhost", google: null,
  mail: { host: "smtp.zeptomail.com", port: 465, username: "fixture", password: "fixture", from: "auth@fixture.invalid" }
};
const auth = pool ? createMemberAuth(config, { pool, isActiveMember: async () => false,
  sendMail: async (notification) => { notifications.push(notification); } }) : null;
before(async () => {
  if (!pool || !auth) return;
  await pool.query("CREATE SCHEMA IF NOT EXISTS member_auth_server_test");
  await (await getMigrations(auth.options)).runMigrations();
});
after(async () => { await pool?.end(); });

function request(path: string, body?: Record<string, unknown>, cookie = "") {
  return new Request(`${config.origin}/api/auth${path}`, { method: body ? "POST" : "GET",
    headers: { host: "localhost:3240", origin: config.origin, "content-type": "application/json", "x-member-local-ip": "127.0.0.1", cookie },
    ...(body ? { body: JSON.stringify(body) } : {}) });
}
function cookies(response: Response) {
  return response.headers.getSetCookie().map((line) => line.split(";")[0]).join("; ");
}

test("actual email OTP verifies email but does not unlock passkey enrollment for pending members", { skip: !auth }, async () => {
  const email = "email-otp@fixture.invalid";
  const sent = await auth!.handler(request("/email-otp/send-verification-otp", { email, type: "sign-in" }));
  assert.equal(sent.status, 200);
  const mail = notifications.find((value) => value.email === email && value.type === "email-otp");
  assert.ok(mail?.type === "email-otp");
  assert.equal(mail.otp.length, 6);
  assert.match(mail.otp, /^[A-Z0-9]{6}$/);
  const stored = await pool!.query('SELECT value FROM member_auth_server_test.verification');
  assert.ok(stored.rows.length);
  assert.ok(stored.rows.every((row) => !String(row.value).includes(mail.otp)));
  const wrong = await auth!.handler(request("/sign-in/email-otp", { email, otp: mail.otp === "000000" ? "111111" : "000000" }));
  assert.notEqual(wrong.status, 200);
  const accepted = await auth!.handler(request("/sign-in/email-otp", { email, otp: mail.otp.toLowerCase() }));
  assert.equal(accepted.status, 200);
  const token = cookies(accepted);
  assert.match(token, /sophomores-member\.session_token=/);
  assert.ok(accepted.headers.getSetCookie().some((value) => /HttpOnly/i.test(value)));
  const session = await auth!.api.getSession({ headers: new Headers({ cookie: token }), query: { disableCookieCache: true } });
  assert.equal(session?.user.email, email);
  assert.equal(session?.user.emailVerified, true);
  const passkey = await auth!.handler(request("/passkey/generate-register-options", undefined, token));
  assert.equal(passkey.status, 403);
  const replay = await auth!.handler(request("/sign-in/email-otp", { email, otp: mail.otp }));
  assert.notEqual(replay.status, 200);
});

test("actual magic links are hashed, pinned to the account continuation and single-use", { skip: !auth }, async () => {
  const email = "magic-link@fixture.invalid";
  const sent = await auth!.handler(request("/sign-in/magic-link", { email, callbackURL: "/account" }));
  assert.equal(sent.status, 200);
  const mail = notifications.find((value) => value.email === email && value.type === "magic-link");
  assert.ok(mail?.type === "magic-link");
  const url = new URL(mail.url);
  assert.equal(new URL(url.searchParams.get("callbackURL")!, config.origin).pathname, "/account/continue");
  assert.equal(new URL(url.searchParams.get("newUserCallbackURL")!, config.origin).pathname, "/account/continue");
  assert.equal(new URL(url.searchParams.get("errorCallbackURL")!, config.origin).pathname, "/account");
  const secret = url.searchParams.get("token");
  assert.ok(secret);
  assert.equal(url.origin, config.origin);
  const stored = await pool!.query('SELECT value,identifier FROM member_auth_server_test.verification');
  assert.ok(stored.rows.every((row) => !String(row.value).includes(secret) && !String(row.identifier).includes(secret)));
  const accepted = await auth!.handler(new Request(mail.url, { headers: { host: "localhost:3240" } }));
  assert.equal(accepted.status, 302);
  assert.equal(accepted.headers.get("location"), `${config.origin}/account/continue`);
  const session = await auth!.api.getSession({ headers: new Headers({ cookie: cookies(accepted) }), query: { disableCookieCache: true } });
  assert.equal(session?.user.email, email);
  assert.equal(session?.user.emailVerified, true);
  const returning = await auth!.handler(request("/sign-in/magic-link", { email, callbackURL: "/account/continue" }));
  assert.equal(returning.status, 200);
  const returningMail = notifications.filter((value) => value.email === email && value.type === "magic-link").at(-1);
  assert.ok(returningMail?.type === "magic-link");
  const returningAccepted = await auth!.handler(new Request(returningMail.url, { headers: { host: "localhost:3240" } }));
  assert.equal(returningAccepted.status, 302);
  assert.equal(returningAccepted.headers.get("location"), `${config.origin}/account/continue`);
  const replay = await auth!.handler(new Request(mail.url, { headers: { host: "localhost:3240" } }));
  assert.equal(replay.headers.getSetCookie().some((value) => value.startsWith("sophomores-member.session_token=")), false);
});

test("Google initiation requests only identity scopes and rejects caller expansion", { skip: !pool }, async () => {
  const google = createMemberAuth({ ...config, google: { clientId: "123-fixture.apps.googleusercontent.com", clientSecret: "private-fixture-secret" } },
    { pool: pool!, isActiveMember: async () => false, sendMail: async () => {} });
  const response = await google.handler(request("/sign-in/social", { provider: "google", callbackURL: "/account", disableRedirect: true }));
  assert.equal(response.status, 200);
  const data = await response.json();
  const url = new URL(data.url);
  assert.equal(url.origin, "https://accounts.google.com");
  assert.deepEqual(new Set(url.searchParams.get("scope")!.split(" ")), new Set(["openid", "email", "profile"]));
  assert.equal(url.searchParams.get("access_type"), "online");
  const expanded = await google.handler(request("/sign-in/social", { provider: "google", callbackURL: "/account", scopes: ["https://www.googleapis.com/auth/gmail.readonly"] }));
  assert.equal(expanded.status, 403);
  const callback = await google.handler(request("/callback/google?state=invalid&code=invalid"));
  assert.notEqual(callback.status, 403);
  assert.equal(callback.headers.getSetCookie().some((value) => value.startsWith("sophomores-member.session_token=")), false);
});
