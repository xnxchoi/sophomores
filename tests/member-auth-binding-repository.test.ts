import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { Pool } from "pg";
import { PgMemberRepository } from "../lib/member-auth/repository";
import { MemberError, type BindRecord } from "../lib/member-auth/contracts";

const now = new Date("2040-01-01T12:00:00Z");
const input: BindRecord = { userId: "member-1", challengeId: randomUUID(), phoneHash: "a".repeat(64), sessionHash: "b".repeat(64), sessionCreatedAt: new Date(now.getTime() - 60_000), now };
const challenge = { id: input.challengeId, state: "verified", created_at: new Date(now.getTime() - 30_000), expires_at: new Date(now.getTime() + 60_000), policy_version: "local-skt-zoho-arc-v1" };
const binding = { user_id: input.userId, challenge_id: input.challengeId, phone_hash: input.phoneHash, policy_version: "local-skt-zoho-arc-v1", verified_at: now };

function database(options: { verified?: boolean; noUser?: boolean; challenge?: unknown; bindings?: unknown[]; insertFailure?: unknown; consumed?: number; rate?: number; directFailure?: boolean } = {}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  let released = false;
  const query = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    if (options.directFailure) throw new Error("private storage");
    if (/INSERT INTO member_auth.bind_limits/.test(sql)) return { rows: [{ attempts: options.rate ?? 1 }], rowCount: 1 };
    if (/FROM member_auth\."user"/.test(sql) && /FOR UPDATE/.test(sql)) return { rows: options.noUser ? [] : [{ id: input.userId, emailVerified: options.verified ?? true }], rowCount: options.noUser ? 0 : 1 };
    if (/FROM member_auth.phone_bindings/.test(sql) && /FOR UPDATE/.test(sql)) return { rows: options.bindings ?? [], rowCount: (options.bindings ?? []).length };
    if (/FROM phone_verification.challenges/.test(sql)) return { rows: options.challenge === null ? [] : [options.challenge ?? challenge], rowCount: options.challenge === null ? 0 : 1 };
    if (/INSERT INTO member_auth.phone_bindings/.test(sql)) {
      if (options.insertFailure) throw options.insertFailure;
      return { rows: [binding], rowCount: 1 };
    }
    if (/UPDATE phone_verification.challenges/.test(sql)) return { rows: options.consumed === 0 ? [] : [{ id: input.challengeId }], rowCount: options.consumed ?? 1 };
    if (/FROM member_auth.phone_bindings/.test(sql) && /JOIN/.test(sql)) return { rows: options.bindings ?? [], rowCount: (options.bindings ?? []).length };
    if (/FROM member_auth.phone_bindings/.test(sql)) return { rows: options.bindings ?? [], rowCount: (options.bindings ?? []).length };
    return { rows: [], rowCount: 0 };
  };
  const client = { query, release() { released = true; } };
  const pool = { query, async connect() { return client; } } as unknown as Pool;
  return { calls, pool, get released() { return released; } };
}

test("repository binds and consumes in one checked-out transaction with fenced policy", async () => {
  const db = database();
  const result = await new PgMemberRepository(db.pool).bind(input);
  assert.deepEqual(result, { userId: input.userId, challengeId: input.challengeId, policyVersion: "local-skt-zoho-arc-v1", verifiedAt: now });
  const statements = db.calls.map(c => c.sql);
  assert.equal(statements[0], "BEGIN");
  assert.equal(statements.at(-1), "COMMIT");
  assert.equal(db.released, true);
  assert.equal(statements.filter(s => s.includes("INSERT INTO member_auth.phone_bindings")).length, 1);
  assert.ok(statements.findIndex(s => s.includes("FOR UPDATE") && s.includes("phone_verification")) < statements.findIndex(s => s.includes("INSERT INTO member_auth.phone_bindings")));
  assert.match(statements.find(s => s.includes("UPDATE phone_verification.challenges"))!, /expires_at/);
});

test("repository idempotency accepts only identical binding and never consumes another challenge", async () => {
  const db = database({ bindings: [binding], challenge: { ...challenge, state: "consumed" } });
  assert.equal((await new PgMemberRepository(db.pool).bind(input)).challengeId, input.challengeId);
  assert.equal(db.calls.some(c => c.sql.includes("UPDATE phone_verification.challenges")), false);
  for (const patch of [{ user_id: "other" }, { challenge_id: randomUUID() }, { phone_hash: "c".repeat(64) }]) {
    const db = database({ bindings: [{ ...binding, ...patch }] });
    await assert.rejects(new PgMemberRepository(db.pool).bind(input), { code: "PHONE_CONFLICT" });
    assert.equal(db.calls.at(-1)?.sql, "ROLLBACK");
    assert.equal(db.calls.some(c => c.sql.includes("UPDATE phone_verification.challenges")), false);
  }
  await assert.rejects(new PgMemberRepository(database({ bindings: [binding], challenge: null }).pool).bind(input), { code: "INVALID_PHONE_PROOF" });
  await assert.rejects(new PgMemberRepository(database({ bindings: [binding] }).pool).bind(input), { code: "INVALID_PHONE_PROOF" });
});

test("repository refuses unavailable principal or ineligible proof without insertion", async () => {
  for (const options of [{ noUser: true }, { verified: false }, { challenge: null }, ...["pending", "review", "expired", "cancelled", "consumed"].map(state => ({ challenge: { ...challenge, state } })), { challenge: { ...challenge, policy_version: "arbitrary" } }, { challenge: { ...challenge, expires_at: new Date(now.getTime() - 1) } }, { challenge: { ...challenge, created_at: new Date(now.getTime() + 1) } }, { challenge: { ...challenge, created_at: new Date(input.sessionCreatedAt.getTime() - 1) } }]) {
    const db = database(options);
    await assert.rejects(new PgMemberRepository(db.pool).bind(input), MemberError);
    assert.equal(db.calls.some(c => c.sql.includes("INSERT INTO member_auth.phone_bindings")), false);
    assert.equal(db.calls.at(-1)?.sql, "ROLLBACK");
  }
  const db = database();
  await assert.rejects(new PgMemberRepository(db.pool).bind({ ...input, sessionCreatedAt: new Date(now.getTime() - 900_001) }), { code: "FRESH_AUTH_REQUIRED" });
});

test("repository rolls back insertion failures and expiry before final consume", async () => {
  for (const error of [new Error("private SQL error"), { code: "23505" }]) {
    const db = database({ insertFailure: error });
    await assert.rejects(new PgMemberRepository(db.pool).bind(input));
    assert.equal(db.calls.at(-1)?.sql, "ROLLBACK");
    assert.equal(db.calls.some(c => c.sql.includes("UPDATE phone_verification.challenges")), false);
    assert.equal(db.released, true);
  }
  const db = database({ consumed: 0 });
  await assert.rejects(new PgMemberRepository(db.pool).bind(input), { code: "INVALID_PHONE_PROOF" });
  assert.equal(db.calls.at(-1)?.sql, "ROLLBACK");
});

test("repository migration is idempotent and rate limits use parameterized persistent buckets", async () => {
  const db = database();
  const repository = new PgMemberRepository(db.pool);
  await repository.migrate();
  assert.match(db.calls.map(c => c.sql).join("\n"), /CREATE TABLE IF NOT EXISTS member_auth.phone_bindings/);
  assert.match(db.calls.map(c => c.sql).join("\n"), /UNIQUE/);
  await repository.enforceBindRate({ keyHash: "a".repeat(64), now });
  const sql = db.calls.find(c => c.sql.includes("INSERT INTO member_auth.bind_limits"))!;
  assert.equal(sql.sql.includes("a".repeat(64)), false);
  assert.equal(sql.values?.[0], "a".repeat(64));
  await assert.rejects(new PgMemberRepository(database({ rate: 6 }).pool).enforceBindRate({ keyHash: "a".repeat(64), now }), { code: "RATE_LIMITED" });
});

test("repository safe lookups return only member facts and filter unverified users", async () => {
  const empty = new PgMemberRepository(database().pool);
  assert.equal(await empty.getBinding(input.userId), null);
  assert.equal(await empty.isActiveMember(input.userId), false);
  assert.equal(await empty.findBoundUserByPhoneHash(input.phoneHash), null);
  const db = database({ bindings: [{ ...binding, userId: input.userId, email: "member@example.invalid", name: "Member" }] });
  const repository = new PgMemberRepository(db.pool);
  assert.equal((await repository.getBinding(input.userId))?.userId, input.userId);
  assert.equal(await repository.isActiveMember(input.userId), true);
  assert.deepEqual(await repository.findBoundUserByPhoneHash(input.phoneHash), { userId: input.userId, email: "member@example.invalid", name: "Member" });
  assert.ok(db.calls.filter(c => /JOIN/.test(c.sql)).every(c => c.sql.includes('"emailVerified"')));
});
