import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { after, afterEach, test } from "node:test";
import { Pool } from "pg";
import { PgPayloadMemberRepository } from "../../lib/member-auth/payload-repository";
import { PgPhoneIdentifier } from "../../lib/member-auth/identifier";
import { digest } from "../../lib/phone-verification/server/crypto";
import type { BindRecord } from "../../lib/member-auth/contracts";

// Explicit opt-in, using the existing local database after normal migrations.
// No table/schema creation, migration, reset, or provider calls occur in this suite.
const url = process.env.CANONICAL_MEMBER_TEST_DATABASE_URL;
if (url) {
  const target = new URL(url);
  if (!["postgres:", "postgresql:"].includes(target.protocol)
    || !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)
    || target.search || target.hash || process.env.NODE_ENV === "production") throw new Error("Canonical tests require a local development database.");
  if (process.env.DATABASE_URI && new URL(process.env.DATABASE_URI).href !== target.href) {
    throw new Error("Canonical tests must use the explicitly selected local Payload database.");
  }
}
const pool = url ? new Pool({ connectionString: url, max: 10, connectionTimeoutMillis: 2000,
  statement_timeout: 5000, lock_timeout: 1000, query_timeout: 6000, allowExitOnIdle: true }) : null;
const repository = pool ? new PgPayloadMemberRepository(pool) : null;
const fixtures: Array<{ userId: string; challengeId: string }> = [];
const secret = "c".repeat(64);
afterEach(async () => {
  if (!pool) return;
  for (const fixture of fixtures.splice(0)) {
    await pool.query("DELETE FROM canonical_member.phone_bindings WHERE user_id=$1", [fixture.userId]);
    await pool.query("DELETE FROM public.sessions WHERE user_id=$1", [fixture.userId]);
    await pool.query("DELETE FROM public.users WHERE id=$1", [fixture.userId]);
    await pool.query("DELETE FROM phone_verification.challenges WHERE id=$1", [fixture.challengeId]);
  }
});
after(async () => { await pool?.end(); });

async function fixture(options: { phone?: string; verified?: boolean; sessionAge?: number; sessionExpiry?: number; proofExpiry?: number } = {}) {
  const now = new Date();
  const userId = randomUUID(), sessionId = randomUUID(), challengeId = randomUUID();
  const sessionCreatedAt = new Date(now.getTime() - (options.sessionAge ?? 60_000));
  const phone = options.phone ?? `010${(randomBytes(4).readUInt32BE() % 100_000_000).toString().padStart(8, "0")}`;
  const browserToken = randomBytes(32).toString("base64url");
  const phoneHash = digest(secret, "phone", phone);
  const sessionHash = digest(secret, "session", browserToken);
  fixtures.push({ userId, challengeId });
  await pool!.query("INSERT INTO public.users(id,email,name,email_verified) VALUES ($1,$2,$3,$4)",
    [userId, `${userId}@fixture.invalid`, "Canonical test member", options.verified ?? true]);
  await pool!.query("INSERT INTO public.sessions(id,user_id,token,created_at,expires_at) VALUES ($1,$2,$3,$4,$5)",
    [sessionId, userId, randomBytes(32).toString("hex"), sessionCreatedAt, new Date(now.getTime() + (options.sessionExpiry ?? 60_000))]);
  await pool!.query(`INSERT INTO phone_verification.challenges
    (id,session_hash,phone_hash,token_hash,proof_hash,state,created_at,expires_at,policy_version)
    VALUES ($1,$2,$3,$4,$5,'verified',$6,$7,'local-skt-zoho-arc-v1')`,
  [challengeId, sessionHash, phoneHash, randomBytes(32).toString("hex"), randomBytes(32).toString("hex"),
    now, new Date(now.getTime() + (options.proofExpiry ?? 60_000))]);
  const input: BindRecord = { userId, sessionId, challengeId, sessionCreatedAt, phoneHash, sessionHash, now: new Date() };
  return { ...input, input, phone, browserToken };
}
async function proofState(id: string) {
  return (await pool!.query("SELECT state FROM phone_verification.challenges WHERE id=$1", [id])).rows[0].state;
}

test("canonical PostgreSQL binding is atomic, idempotent and never trusts mutable membership flags", { skip: !pool }, async () => {
  const f = await fixture();
  assert.equal((await repository!.bind(f.input)).userId, f.userId);
  assert.equal(await proofState(f.challengeId), "consumed");
  assert.equal(await repository!.isActiveMember(f.userId), true);
  assert.equal((await repository!.bind(f.input)).userId, f.userId);
  await assert.rejects(repository!.bind({ ...f.input, sessionHash: randomBytes(32).toString("hex") }), { code: "INVALID_PHONE_PROOF" });
  await pool!.query("UPDATE public.users SET email_verified=false WHERE id=$1", [f.userId]);
  assert.equal(await repository!.isActiveMember(f.userId), false);
  assert.equal(await repository!.findBoundUserByPhoneHash(f.phoneHash), null);
});

test("canonical PostgreSQL binding rechecks revoked/expired sessions and verified email", { skip: !pool }, async () => {
  for (const condition of ["revoked", "expired", "unverified"] as const) {
    const f = await fixture({ verified: condition !== "unverified", sessionExpiry: condition === "expired" ? -1 : 60_000 });
    if (condition === "revoked") await pool!.query("DELETE FROM public.sessions WHERE id=$1", [f.sessionId]);
    await assert.rejects(repository!.bind(f.input), { code: condition === "unverified" ? "EMAIL_REQUIRED" : "UNAUTHENTICATED" });
    assert.equal(await proofState(f.challengeId), "verified");
    assert.equal(await repository!.getBinding(f.userId), null);
  }
});

test("canonical PostgreSQL concurrent phone claims bind one owner without burning the losing proof", { skip: !pool }, async () => {
  const one = await fixture();
  const two = await fixture({ phone: one.phone });
  const results = await Promise.allSettled([repository!.bind(one.input), repository!.bind(two.input)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const loser = results[0].status === "rejected" ? one : two;
  assert.equal(await repository!.getBinding(loser.userId), null);
  assert.equal(await proofState(loser.challengeId), "verified");
});

test("canonical PostgreSQL insert failure leaves both proof and binding unchanged", { skip: !pool }, async () => {
  const f = await fixture();
  const constraint = `canonical_fixture_${randomBytes(4).toString("hex")}`;
  await pool!.query(`ALTER TABLE canonical_member.phone_bindings ADD CONSTRAINT "${constraint}" CHECK (user_id <> '${f.userId}')`);
  try {
    await assert.rejects(repository!.bind(f.input));
    assert.equal(await proofState(f.challengeId), "verified");
    assert.equal(await repository!.getBinding(f.userId), null);
  } finally { await pool!.query(`ALTER TABLE canonical_member.phone_bindings DROP CONSTRAINT "${constraint}"`); }
});

test("canonical PostgreSQL session expiry and freshness advance while a phone proof lock is held", { skip: !pool }, async () => {
  for (const options of [{ proofExpiry: 80 }, { sessionExpiry: 80 }, { sessionAge: 899_950 }]) {
    const f = await fixture(options);
    const blocker = await pool!.connect();
    await blocker.query("BEGIN");
    await blocker.query("SELECT id FROM phone_verification.challenges WHERE id=$1 FOR UPDATE", [f.challengeId]);
    const pending = repository!.bind(f.input);
    const rejected = assert.rejects(pending, { code: "proofExpiry" in options ? "INVALID_PHONE_PROOF"
      : "sessionExpiry" in options ? "UNAUTHENTICATED" : "FRESH_AUTH_REQUIRED" });
    try { await delay(150); await blocker.query("COMMIT"); await rejected; }
    finally { blocker.release(); }
    assert.equal(await proofState(f.challengeId), "verified");
    assert.equal(await repository!.getBinding(f.userId), null);
  }
});

test("canonical phone identifier constrains the selected account without authenticating", { skip: !pool }, async () => {
  const one = await fixture();
  const two = await fixture();
  await repository!.bind(one.input);
  const identifier = new PgPhoneIdentifier(pool!, { origin: "http://localhost:3000", secret: "d".repeat(64),
    verificationSecret: secret, schema: "canonical_member" });
  const { token } = await identifier.start(one.phone, `canonical-fixture:${randomUUID()}`);
  try {
    const headers = new Headers({ cookie: `sophomores-phone-identifier=${token}` });
    await identifier.assert(headers, one.userId);
    await assert.rejects(identifier.assert(headers, two.userId), { code: "IDENTIFIER_MISMATCH" });
  } finally { await identifier.clear(token); }
});
