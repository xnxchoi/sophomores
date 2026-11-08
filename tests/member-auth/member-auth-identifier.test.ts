import assert from "node:assert/strict";
import { test } from "node:test";
import type { Pool } from "pg";
import { digest } from "@/lib/phone-verification/server/crypto";
import { IDENTIFIER_COOKIE, IdentifierError, PgPhoneIdentifier } from "@/lib/member-auth/identifier";

const options = { secret: "b".repeat(64), verificationSecret: "a".repeat(64), origin: "http://localhost:3240" };
const token = "Z".repeat(43);
const phone = "01012345678";
const phoneHash = digest(options.verificationSecret, "phone", phone);
const now = new Date("2040-01-01T00:00:00Z");

function storage(input: { attempts?: number[]; rows?: unknown[]; fail?: string; onLookup?: () => void } = {}) {
  const calls: { sql: string; values: unknown[] }[] = [];
  let released = 0;
  let rate = 0;
  const query = async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    if (input.fail && sql.includes(input.fail)) throw new Error("synthetic private storage detail");
    if (sql.includes("RETURNING attempts")) return { rows: [{ attempts: input.attempts?.[rate++] ?? 1 }], rowCount: 1 };
    if (sql.includes("LEFT JOIN member_auth.phone_bindings")) {
      input.onLookup?.();
      return { rows: input.rows ?? [], rowCount: input.rows?.length ?? 0 };
    }
    return { rows: [], rowCount: 1 };
  };
  const pool = { query, connect: async () => ({ query, release: () => { released++; } }) } as unknown as Pool;
  return { pool, calls, released: () => released };
}

function identifier(db = storage(), extra: { now?: () => Date } = {}) {
  return { ...db, service: new PgPhoneIdentifier(db.pool, { ...options, now: () => now, ...extra }) };
}
const headers = (value = token) => new Headers({ cookie: `${IDENTIFIER_COOKIE}=${value}` });
const isCode = (code: string) => (error: unknown) => error instanceof IdentifierError && error.code === code;

test("phone identification stores only keyed digests and never looks up account existence", async () => {
  const s = identifier();
  const result = await s.service.start("+82 10-1234-5678", "loopback");
  assert.match(result.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(s.calls.some(({ sql }) => sql.includes("phone_bindings") || sql.includes('member_auth."user"')), false);
  const serialized = JSON.stringify(s.calls);
  assert.doesNotMatch(serialized, /01012345678|821012345678/);
  assert.equal(serialized.includes(result.token), false);
  assert.equal(serialized.includes(phoneHash), true);
  assert.equal(s.calls[0].sql, "BEGIN");
  assert.equal(s.calls.at(-1)?.sql, "COMMIT");
  assert.equal(s.released(), 1);
});

test("phone identifier validation rejects invalid inputs before storage", async () => {
  const s = identifier();
  for (const invalid of [null, undefined, "", "0101234", "010123456789", "010' OR 1=1", "01012345678\n", "０１０１２３４５６７８", "😀", "x".repeat(10_000), 123, {}]) {
    await assert.rejects(s.service.start(invalid as string, "loopback"), isCode("INVALID_INPUT"));
  }
  for (const invalid of ["", "x".repeat(257), null, 12]) {
    await assert.rejects(s.service.start(phone, invalid as string), isCode("INVALID_INPUT"));
  }
  assert.equal(s.calls.length, 0);
});

test("identifier configuration is local-only with separate sufficiently long secrets", () => {
  for (const changed of [
    { secret: "short" }, { verificationSecret: "short" }, { secret: options.verificationSecret },
    { origin: "https://example.com" }, { origin: "http://127.0.0.1:3240" },
    { origin: "http://localhost:3240/path" }, { origin: "http://user@localhost:3240" },
    { origin: "http://localhost:3240?x=1" }
  ]) assert.throws(() => new PgPhoneIdentifier(storage().pool, { ...options, ...changed }));
});

test("persistent identifier rate limits roll back and do not create an intent", async () => {
  for (const attempts of [[21], [1, 6]]) {
    const s = identifier(storage({ attempts }));
    await assert.rejects(s.service.start(phone, "loopback"), isCode("RATE_LIMITED"));
    assert.equal(s.calls.some(({ sql }) => sql.startsWith("INSERT INTO member_auth.phone_login_intents")), false);
    assert.equal(s.calls.at(-1)?.sql, "ROLLBACK");
    assert.equal(s.released(), 1);
  }
});

test("identifier storage failures are fixed errors, roll back and release", async () => {
  const s = identifier(storage({ fail: "INSERT INTO member_auth.phone_login_intents" }));
  await assert.rejects(s.service.start(phone, "loopback"), (error: unknown) => {
    assert.equal(error instanceof IdentifierError, true);
    assert.equal((error as IdentifierError).code, "UNAVAILABLE");
    assert.doesNotMatch(String(error), /private storage detail/);
    return true;
  });
  assert.equal(s.calls.at(-1)?.sql, "ROLLBACK");
  assert.equal(s.released(), 1);
  const failing = identifier(storage({ fail: "DELETE FROM member_auth.phone_login_intents" }));
  await assert.rejects(failing.service.clear(token), isCode("UNAVAILABLE"));
});

test("connection, lookup, migration, rollback and invalid-clock failures remain closed", async () => {
  const disconnected = new PgPhoneIdentifier({ connect: async () => { throw new Error("private connection detail"); } } as unknown as Pool, options);
  await assert.rejects(disconnected.start(phone, "loopback"), isCode("UNAVAILABLE"));
  const unavailable = identifier(storage({ fail: "LEFT JOIN member_auth.phone_bindings" }));
  await assert.rejects(unavailable.service.assert(headers(), "member-one"), isCode("UNAVAILABLE"));
  await assert.rejects(identifier(storage({ fail: "CREATE TABLE" })).service.migrate(), isCode("UNAVAILABLE"));
  const invalidClock = identifier(storage(), { now: () => new Date("invalid") });
  await assert.rejects(invalidClock.service.start(phone, "loopback"), isCode("UNAVAILABLE"));
  let released = false;
  const broken = new PgPhoneIdentifier({ connect: async () => ({
    query: async (sql: string) => { if (sql === "BEGIN") return {}; throw new Error("private rollback detail"); },
    release: () => { released = true; }
  }) } as unknown as Pool, options);
  await assert.rejects(broken.start(phone, "loopback"), isCode("UNAVAILABLE"));
  assert.equal(released, true);
});

test("a missing phone choice permits normal email-first signup without account lookup", async () => {
  const s = identifier();
  await s.service.assert(new Headers(), "pending-user");
  await s.service.assert(new Headers({ cookie: `other=${token}; ${IDENTIFIER_COOKIE}-other=${token}` }), "pending-user");
  assert.equal(s.calls.length, 0);
});

test("only the authenticated account with the exact selected phone may continue", async () => {
  const s = identifier(storage({ rows: [{ phone_hash: phoneHash, bound_phone_hash: phoneHash, expires_at: new Date(now.getTime() + 60_000) }] }));
  await s.service.assert(headers(), "member-one");
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].values.includes(token), false);
  assert.equal(s.calls[0].values.includes("member-one"), true);
  for (const row of [
    undefined,
    { phone_hash: phoneHash, bound_phone_hash: null, expires_at: new Date(now.getTime() + 60_000) },
    { phone_hash: phoneHash, bound_phone_hash: "f".repeat(64), expires_at: new Date(now.getTime() + 60_000) },
    { phone_hash: phoneHash, bound_phone_hash: phoneHash, expires_at: now },
    { phone_hash: "bad", bound_phone_hash: "bad", expires_at: new Date(now.getTime() + 60_000) },
    { phone_hash: phoneHash, bound_phone_hash: phoneHash, expires_at: new Date("invalid") }
  ]) {
    const other = identifier(storage({ rows: row ? [row] : [] }));
    await assert.rejects(other.service.assert(headers(), "member-one"), isCode("IDENTIFIER_MISMATCH"));
  }
});

test("expired, duplicate, malformed and unknown identifier choices never silently disappear", async () => {
  const s = identifier();
  for (const value of ["", "short", "A".repeat(44), `${token}; ${IDENTIFIER_COOKIE}=${token}`]) {
    await assert.rejects(s.service.assert(headers(value), "member-one"), isCode("IDENTIFIER_MISMATCH"));
  }
  await assert.rejects(s.service.assert(new Headers({ cookie: "x=" + "x".repeat(8192) }), "member-one"), isCode("IDENTIFIER_MISMATCH"));
  await assert.rejects(s.service.assert(headers(), "member-one"), isCode("IDENTIFIER_MISMATCH"));
  await assert.rejects(s.service.assert(headers(), ""), isCode("IDENTIFIER_MISMATCH"));
});

test("identifier expiry is sampled after awaiting database work", async () => {
  let clock = now;
  const s = identifier(storage({
    rows: [{ phone_hash: phoneHash, bound_phone_hash: phoneHash, expires_at: new Date(now.getTime() + 1) }],
    onLookup: () => { clock = new Date(now.getTime() + 2); }
  }), { now: () => clock });
  await assert.rejects(s.service.assert(headers(), "member-one"), isCode("IDENTIFIER_MISMATCH"));
});

test("clear deletes only an opaque token digest; migration creates bounded metadata tables", async () => {
  const s = identifier();
  await s.service.clear(token);
  assert.equal(JSON.stringify(s.calls).includes(token), false);
  assert.match(s.calls[0].sql, /DELETE FROM member_auth.phone_login_intents WHERE token_hash=\$1/);
  for (const invalid of ["", "bad", undefined]) await assert.rejects(s.service.clear(invalid as string), isCode("INVALID_INPUT"));
  const migration = identifier();
  await migration.service.migrate();
  const sql = migration.calls.map(({ sql }) => sql).join("\n");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS member_auth.phone_login_intents/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS member_auth.phone_identifier_limits/);
  assert.doesNotMatch(sql, /email|password|CREATE.*session/i);
});
