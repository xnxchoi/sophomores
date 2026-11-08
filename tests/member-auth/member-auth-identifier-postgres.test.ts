import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { digest } from "@/lib/phone-verification/server/crypto";
import { IDENTIFIER_COOKIE, IdentifierError, PgPhoneIdentifier } from "@/lib/member-auth/identifier";
import { createPhoneIdentifierHandlers } from "@/lib/member-auth/identifier-http";

const url = process.env.MEMBER_AUTH_TEST_DATABASE_URL;
function requireTestDatabase(value: string): void {
  const candidate = new URL(value);
  if (!["postgres:", "postgresql:"].includes(candidate.protocol)
    || !["localhost", "127.0.0.1", "[::1]"].includes(candidate.hostname)
    || !/^\/sophomores_(?:verification_test|member_auth_test)(?:_[a-z0-9_]+)?$/.test(candidate.pathname)
    || candidate.search || candidate.hash) throw new Error("Identifier tests require a disposable local test database");
}
if (url) requireTestDatabase(url);
const pool = url ? new Pool({ connectionString: url, max: 4, connectionTimeoutMillis: 2000, statement_timeout: 5000, lock_timeout: 1000 }) : null;
const origin = "http://localhost:3240";
const options = { origin, secret: randomBytes(32).toString("hex"), verificationSecret: randomBytes(32).toString("hex") };
const userId = "identifier-" + randomUUID();
const phone = "01012345678";
let clock = new Date();
const identifier = pool ? new PgPhoneIdentifier(pool, { ...options, now: () => clock }) : null;
const tokenHash = (token: string) => digest(options.secret, "member-phone-identifier-token", token);
const cookie = (token: string) => new Headers({ cookie: `${IDENTIFIER_COOKIE}=${token}` });

before(async () => {
  if (!pool || !identifier) return;
  await pool.query(`CREATE SCHEMA IF NOT EXISTS member_auth;
    CREATE TABLE IF NOT EXISTS member_auth."user" (
      id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
      "emailVerified" boolean NOT NULL, image text, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL
    );
    CREATE TABLE IF NOT EXISTS member_auth.phone_bindings (
      user_id text PRIMARY KEY REFERENCES member_auth."user"(id) ON DELETE CASCADE,
      phone_hash text NOT NULL UNIQUE, challenge_id uuid NOT NULL UNIQUE,
      policy_version text NOT NULL, verified_at timestamptz NOT NULL
    );`);
  await identifier.migrate();
  await pool.query('INSERT INTO member_auth."user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES ($1,$2,$3,true,$4,$4)', [userId, "Synthetic identifier test", `${userId}@fixture.invalid`, clock]);
  await pool.query("INSERT INTO member_auth.phone_bindings (user_id,phone_hash,challenge_id,policy_version,verified_at) VALUES ($1,$2,$3,$4,$5)", [userId, digest(options.verificationSecret, "phone", phone), randomUUID(), "local-skt-zoho-arc-v1", clock]);
});
after(async () => {
  if (!pool) return;
  try { await pool.query('DELETE FROM member_auth."user" WHERE id=$1', [userId]); }
  finally { await pool.end(); }
});

test("identifier test database guard rejects runtime, remote and substring databases", () => {
  for (const bad of ["postgres://localhost/sophomores_verification_local", "postgres://remote.example/sophomores_member_auth_test", "postgres://localhost/production_test", "https://localhost/sophomores_member_auth_test", "postgres://localhost/sophomores_member_auth_test?x=1"]) assert.throws(() => requireTestDatabase(bad));
  for (const good of ["postgres://127.0.0.1/sophomores_verification_test_identifier", "postgres://localhost/sophomores_member_auth_test_identifier"]) assert.doesNotThrow(() => requireTestDatabase(good));
});

test("PostgreSQL identifier selection does not create users/sessions or disclose known accounts", { skip: !pool }, async () => {
  const handlers = createPhoneIdentifierHandlers({ origin, identifier: identifier! });
  const beforeCount = (await pool!.query('SELECT count(*)::int AS count FROM member_auth."user"')).rows[0].count;
  const responses: Response[] = [];
  for (const value of [phone, "01087654321"]) responses.push(await handlers.start(new Request(origin + "/api/member/identify", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ phone: value })
  })));
  assert.deepEqual(responses.map((r) => r.status), [200, 200]);
  assert.deepEqual(await responses[0].json(), await responses[1].json());
  const tokens = responses.map((r) => new RegExp(`${IDENTIFIER_COOKIE}=([A-Za-z0-9_-]{43})`).exec(r.headers.get("set-cookie") ?? "")![1]);
  assert.notEqual(tokens[0], tokens[1]);
  await identifier!.assert(cookie(tokens[0]), userId);
  await assert.rejects(identifier!.assert(cookie(tokens[1]), userId), (e: unknown) => e instanceof IdentifierError && e.code === "IDENTIFIER_MISMATCH");
  const stored = (await pool!.query("SELECT token_hash,phone_hash,created_at,expires_at FROM member_auth.phone_login_intents WHERE token_hash=$1", [tokenHash(tokens[0])])).rows[0];
  assert.equal(stored.phone_hash, digest(options.verificationSecret, "phone", phone));
  assert.equal(stored.expires_at.getTime() - stored.created_at.getTime(), 300_000);
  assert.equal(JSON.stringify(stored).includes(tokens[0]), false);
  assert.equal(JSON.stringify(stored).includes(phone), false);
  assert.equal((await pool!.query('SELECT count(*)::int AS count FROM member_auth."user"')).rows[0].count, beforeCount);
  await pool!.query("UPDATE member_auth.phone_login_intents SET expires_at=$2 WHERE token_hash=$1", [tokenHash(tokens[0]), new Date(clock.getTime() + 1)]);
  clock = new Date(clock.getTime() + 2);
  await assert.rejects(identifier!.assert(cookie(tokens[0]), userId), (e: unknown) => e instanceof IdentifierError && e.code === "IDENTIFIER_MISMATCH");
  const cleared = await handlers.clear(new Request(origin + "/api/member/identify", { method: "DELETE", headers: { Origin: origin, Cookie: `${IDENTIFIER_COOKIE}=${tokens[1]}` } }));
  assert.equal(cleared.status, 200);
  assert.match(cleared.headers.get("set-cookie") ?? "", /Max-Age=0/);
  assert.equal((await pool!.query("SELECT count(*)::int AS count FROM member_auth.phone_login_intents WHERE token_hash=$1", [tokenHash(tokens[1])])).rows[0].count, 0);
});

test("PostgreSQL concurrent phone identifier limits are persistent and atomic", { skip: !pool }, async () => {
  const attempts = await Promise.allSettled(Array.from({ length: 6 }, (_, index) => identifier!.start("01099990000", `synthetic-${index}`)));
  assert.equal(attempts.filter((result) => result.status === "fulfilled").length, 5);
  const failures = attempts.filter((result) => result.status === "rejected");
  assert.equal(failures.length, 1);
  assert.equal(failures[0].status === "rejected" && failures[0].reason instanceof IdentifierError && failures[0].reason.code === "RATE_LIMITED", true);
  for (const result of attempts) if (result.status === "fulfilled") await identifier!.clear(result.value.token);
});
