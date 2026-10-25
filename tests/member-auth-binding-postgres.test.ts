import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { after, before, test } from "node:test";
import { Pool } from "pg";
import { PgMemberRepository } from "../lib/member-auth/repository";
import { MemberBindingService } from "../lib/member-auth/service";
import { createMemberHandlers } from "../lib/member-auth/http";
import { digest } from "../lib/phone-verification/server/crypto";
import { PgPhoneVerificationRepository } from "../lib/phone-verification/server/postgres";
import { SESSION_COOKIE } from "../lib/phone-verification/server/http";

const url = process.env.MEMBER_AUTH_TEST_DATABASE_URL;
function requireDisposable(value: string) {
  const candidate = new URL(value);
  if (!["postgres:", "postgresql:"].includes(candidate.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(candidate.hostname) || !/^\/sophomores_verification_test(?:_[a-z0-9_]+)?$/.test(candidate.pathname) || candidate.search || candidate.hash) throw new Error("Member tests require a separate disposable local database");
}
if (url) requireDisposable(url);
const pool = url ? new Pool({ connectionString: url, max: 10, connectionTimeoutMillis: 2000 }) : null;
const repository = pool ? new PgMemberRepository(pool) : null;
const secret = "c".repeat(64);
const capabilities = { emailOtp: true, magicLink: true, google: false, passkey: true };
before(async () => {
  if (!pool || !repository) return;
  await pool.query(`CREATE SCHEMA IF NOT EXISTS member_auth;
    CREATE TABLE IF NOT EXISTS member_auth."user" (
      id text PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL,
      "emailVerified" boolean NOT NULL DEFAULT false, image text,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
  await new PgPhoneVerificationRepository(pool).migrate();
  await repository.migrate();
});
after(async () => { await pool?.end(); });

async function fixture(options: { phone?: string; state?: string; policy?: string; expiresMs?: number; sessionAgeMs?: number; challengeBeforeSession?: boolean; userVerified?: boolean } = {}) {
  const base = new Date();
  const userId = randomUUID();
  const phone = options.phone ?? `010${(randomBytes(4).readUInt32BE() % 100000000).toString().padStart(8, "0")}`;
  const session = randomBytes(32).toString("base64url");
  const challengeId = randomUUID();
  const sessionCreatedAt = new Date(base.getTime() - (options.sessionAgeMs ?? 60_000));
  const createdAt = options.challengeBeforeSession ? new Date(sessionCreatedAt.getTime() - 1) : new Date(Math.max(sessionCreatedAt.getTime(), base.getTime() - 1000));
  await pool!.query('INSERT INTO member_auth."user" (id,email,name,"emailVerified","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$5)', [userId, `${userId}@fixture.invalid`, "Synthetic member", options.userVerified ?? true, base]);
  await pool!.query(`INSERT INTO phone_verification.challenges (id,session_hash,phone_hash,token_hash,proof_hash,state,created_at,expires_at,policy_version)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [challengeId, digest(secret, "session", session), digest(secret, "phone", phone), randomBytes(32).toString("hex"), randomBytes(32).toString("hex"), options.state ?? "verified", createdAt, new Date(base.getTime() + (options.expiresMs ?? 60_000)), options.policy ?? "local-skt-zoho-arc-v1"]);
  const principal = { userId, emailVerified: true, sessionCreatedAt };
  return { userId, phone, session, challengeId, principal, input: { principal, phone, challengeId, verificationSessionToken: session } };
}
async function challengeState(id: string) { return (await pool!.query("SELECT state FROM phone_verification.challenges WHERE id=$1", [id])).rows[0].state; }

test("member database guard refuses runtime/remote databases", () => {
  for (const value of ["postgres://localhost/sophomores_verification_local", "postgres://remote.example/sophomores_verification_test", "https://localhost/sophomores_verification_test", "postgres://localhost/sophomores_verification_test?options=bad", "postgres://localhost/sophomores_verification_test#bad"]) assert.throws(() => requireDisposable(value));
  requireDisposable("postgres://127.0.0.1/sophomores_verification_test_members");
});

test("PostgreSQL member bind atomically activates, consumes and safely acknowledges identical retries", { skip: !pool }, async () => {
  const f = await fixture();
  const service = new MemberBindingService(repository!, { verificationSecret: secret });
  assert.deepEqual(await service.bind(f.input), { phoneBound: true, member: true });
  await assert.rejects(service.bind({ ...f.input, verificationSessionToken: randomBytes(32).toString("base64url") }), { code: "INVALID_PHONE_PROOF" });
  assert.equal(await challengeState(f.challengeId), "consumed");
  assert.equal(await repository!.isActiveMember(f.userId), true);
  assert.deepEqual(await service.bind(f.input), { phoneBound: true, member: true });
  const row = (await pool!.query("SELECT * FROM member_auth.phone_bindings WHERE user_id=$1", [f.userId])).rows[0];
  assert.equal(row.phone_hash, digest(secret, "phone", f.phone));
  assert.equal(Object.hasOwn(row, "phone"), false);
  assert.equal((await repository!.findBoundUserByPhoneHash(row.phone_hash))?.userId, f.userId);
  await pool!.query('UPDATE member_auth."user" SET "emailVerified"=false WHERE id=$1', [f.userId]);
  assert.equal(await repository!.isActiveMember(f.userId), false);
  assert.equal(await repository!.findBoundUserByPhoneHash(row.phone_hash), null);
});

test("PostgreSQL refuses wrong session/number/policy/state and email-first violations without burning proof", { skip: !pool }, async () => {
  const service = new MemberBindingService(repository!, { verificationSecret: secret });
  for (const options of [{ state: "pending" }, { state: "review" }, { state: "cancelled" }, { state: "consumed" }, { state: "expired" }, { policy: "unapproved" }, { expiresMs: -1 }, { challengeBeforeSession: true }, { userVerified: false }]) {
    const f = await fixture(options);
    await assert.rejects(service.bind(f.input));
    assert.equal(await repository!.getBinding(f.userId), null);
    assert.equal(await challengeState(f.challengeId), options.state ?? "verified");
  }
  const f = await fixture();
  for (const patch of [{ phone: f.phone === "01000000000" ? "01011111111" : "01000000000" }, { verificationSessionToken: randomBytes(32).toString("base64url") }]) await assert.rejects(service.bind({ ...f.input, ...patch }), { code: "INVALID_PHONE_PROOF" });
  assert.equal(await challengeState(f.challengeId), "verified");
});

test("PostgreSQL concurrent claims bind one owner and leave the losing proof reusable", { skip: !pool }, async () => {
  const one = await fixture();
  const two = await fixture({ phone: one.phone });
  const service = new MemberBindingService(repository!, { verificationSecret: secret });
  const results = await Promise.allSettled([service.bind(one.input), service.bind(two.input)]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  const loser = results[0].status === "rejected" ? one : two;
  const rejected = results.find(r => r.status === "rejected") as PromiseRejectedResult;
  assert.equal(rejected.reason.code, "PHONE_CONFLICT");
  assert.equal(await challengeState(loser.challengeId), "verified");
  assert.equal(await repository!.getBinding(loser.userId), null);
});

test("PostgreSQL insertion failure rolls back both binding and challenge consumption", { skip: !pool }, async () => {
  const f = await fixture();
  const constraint = `binding_test_${randomBytes(4).toString("hex")}`;
  await pool!.query(`ALTER TABLE member_auth.phone_bindings ADD CONSTRAINT "${constraint}" CHECK (user_id <> '${f.userId}')`);
  try {
    await assert.rejects(new MemberBindingService(repository!, { verificationSecret: secret }).bind(f.input), { code: "UNAVAILABLE" });
    assert.equal(await challengeState(f.challengeId), "verified");
    assert.equal(await repository!.getBinding(f.userId), null);
  } finally { await pool!.query(`ALTER TABLE member_auth.phone_bindings DROP CONSTRAINT "${constraint}"`); }
  assert.equal((await new MemberBindingService(repository!, { verificationSecret: secret }).bind(f.input)).member, true);
});

test("PostgreSQL expiry and session freshness advance while waiting on challenge locks", { skip: !pool }, async () => {
  for (const options of [{ expiresMs: 60 }, { sessionAgeMs: 899_950 }]) {
    const f = await fixture(options);
    const blocker = await pool!.connect();
    await blocker.query("BEGIN");
    await blocker.query("SELECT id FROM phone_verification.challenges WHERE id=$1 FOR UPDATE", [f.challengeId]);
    const service = new MemberBindingService(repository!, { verificationSecret: secret });
    const pending = service.bind(f.input);
    const rejected = assert.rejects(pending, { code: "expiresMs" in options ? "INVALID_PHONE_PROOF" : "FRESH_AUTH_REQUIRED" });
    try { await delay(100); await blocker.query("COMMIT"); await rejected; }
    finally { blocker.release(); }
    assert.equal(await challengeState(f.challengeId), "verified");
    assert.equal(await repository!.getBinding(f.userId), null);
  }
});

test("PostgreSQL HTTP bind returns no proof or raw phone and active status stays authoritative", { skip: !pool }, async () => {
  const f = await fixture();
  const handlers = createMemberHandlers({ origin: "http://localhost:3240", service: new MemberBindingService(repository!, { verificationSecret: secret }), capabilities, resolvePrincipal: async () => f.principal });
  const response = await handlers.bind(new Request("http://localhost:3240/api/phone-verification/bind", { method: "POST", headers: { Origin: "http://localhost:3240", "Content-Type": "application/json", Cookie: `${SESSION_COOKIE}=${f.session}` }, body: JSON.stringify({ challengeId: f.challengeId, phone: f.phone }) }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, data: { phoneBound: true, member: true } });
  const status = await handlers.status(new Request("http://localhost:3240/api/member/status"));
  assert.deepEqual(await status.json(), { success: true, data: { authenticated: true, emailVerified: true, phoneBound: true, member: true, capabilities } });
  assert.equal(await challengeState(f.challengeId), "consumed");
});

test("PostgreSQL bind rate limit is durable and resets only after its window", { skip: !pool }, async () => {
  const keyHash = randomBytes(32).toString("hex");
  const now = new Date();
  for (let i = 0; i < 5; i++) await repository!.enforceBindRate({ keyHash, now });
  await assert.rejects(repository!.enforceBindRate({ keyHash, now }), { code: "RATE_LIMITED" });
  await repository!.enforceBindRate({ keyHash, now: new Date(now.getTime() + 60_001) });
});
