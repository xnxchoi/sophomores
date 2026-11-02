import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { PgPayloadMemberRepository } from "../../lib/member-auth/payload-repository";
import { MemberError } from "../../lib/member-auth/contracts";

const now = new Date();
const userId = "9e7947d3-2241-432b-a84b-21226aa40bfd";
const sessionId = "f6b138b3-912e-4b54-806d-36efb9eb907b";
const challengeId = "069a74b7-17a2-4368-b3a2-60298eb1bd6a";
const input = { userId, sessionId, challengeId, phoneHash: "a".repeat(64), sessionHash: "b".repeat(64),
  sessionCreatedAt: new Date(now.getTime() - 1000), now };

function fixture(options: { revoked?: boolean; unverified?: boolean; consumeFailed?: boolean;
  existing?: Array<Record<string, unknown>>; proofState?: string; proofPolicy?: string; proofExpiry?: Date;
  sessionExpiry?: Date; sessionCreatedAt?: Date; insertFailure?: boolean } = {}) {
  const calls: string[] = [];
  const client = {
    release() {},
    async query(sql: string) {
      calls.push(sql);
      if (sql.includes("FROM public.users")) return { rows: options.revoked ? [] : [{
        email_verified: !options.unverified, session_created_at: options.sessionCreatedAt ?? input.sessionCreatedAt,
        expires_at: options.sessionExpiry ?? new Date(now.getTime() + 60_000),
      }] };
      if (sql.includes("SELECT") && sql.includes("canonical_member.phone_bindings")) return { rows: options.existing ?? [] };
      if (sql.includes("FROM phone_verification.challenges")) return { rows: [{ id: challengeId,
        state: options.proofState ?? "verified", created_at: now, expires_at: options.proofExpiry ?? new Date(now.getTime() + 60_000),
        policy_version: options.proofPolicy ?? "local-skt-zoho-arc-v1" }] };
      if (sql.includes("INSERT INTO canonical_member.phone_bindings")) {
        if (options.insertFailure) throw Object.assign(new Error("duplicate"), { code: "23505" });
        return { rows: [{ user_id: userId, challenge_id: challengeId, policy_version: "local-skt-zoho-arc-v1", verified_at: now }] };
      }
      if (sql.includes("UPDATE phone_verification.challenges")) return { rowCount: options.consumeFailed ? 0 : 1, rows: [] };
      return { rows: [], rowCount: 0 };
    },
  };
  return { calls, repository: new PgPayloadMemberRepository({ connect: async () => client } as unknown as Pool) };
}

test("canonical binding locks canonical user/session and atomically consumes the phone proof", async () => {
  const { repository, calls } = fixture();
  assert.equal((await repository.bind(input)).userId, userId);
  assert.ok(calls.some((sql) => sql.includes("public.sessions") && sql.includes("FOR UPDATE")));
  assert.ok(calls.some((sql) => sql.includes("UPDATE phone_verification.challenges")));
  assert.equal(calls.at(-1), "COMMIT");
  assert.equal(calls.some((sql) => sql.includes('member_auth."user"')), false);
});

test("revoked sessions, unverified email and failed proof consumption roll back", async () => {
  for (const [options, code] of [
    [{ revoked: true }, "UNAUTHENTICATED"],
    [{ unverified: true }, "EMAIL_REQUIRED"],
    [{ consumeFailed: true }, "INVALID_PHONE_PROOF"],
  ] as const) {
    const { repository, calls } = fixture(options);
    await assert.rejects(repository.bind(input), (error) => error instanceof MemberError && error.code === code);
    assert.equal(calls.at(-1), "ROLLBACK");
    assert.equal(calls.includes("COMMIT"), false);
  }
});

test("canonical repository never accepts a principal without the canonical session ID", async () => {
  const { repository, calls } = fixture();
  await assert.rejects(repository.bind({ ...input, sessionId: undefined }),
    (error) => error instanceof MemberError && error.code === "UNAUTHENTICATED");
  assert.equal(calls.length, 0);
});

const existing = { user_id: userId, challenge_id: challengeId, phone_hash: input.phoneHash,
  policy_version: "local-skt-zoho-arc-v1", verified_at: now };

test("an identical canonical retry succeeds only with its matching consumed proof", async () => {
  const valid = fixture({ existing: [existing], proofState: "consumed" });
  assert.equal((await valid.repository.bind(input)).userId, userId);
  assert.equal(valid.calls.some((sql) => sql.includes("INSERT INTO canonical_member.phone_bindings")), false);
  const unchanged = fixture({ existing: [existing], proofState: "verified" });
  await assert.rejects(unchanged.repository.bind(input), { code: "INVALID_PHONE_PROOF" });
  for (const rows of [
    [{ ...existing, user_id: "another-user" }],
    [{ ...existing, phone_hash: "different" }],
    [{ ...existing, challenge_id: "different" }],
    [{ ...existing, policy_version: "unapproved" }],
    [existing, existing],
  ]) await assert.rejects(fixture({ existing: rows }).repository.bind(input), { code: "PHONE_CONFLICT" });
});

test("canonical binding refuses stale sessions, invalid proofs and unique insertion races", async () => {
  for (const [options, code] of [
    [{ sessionExpiry: new Date(0) }, "UNAUTHENTICATED"],
    [{ sessionCreatedAt: new Date(now.getTime() - 900_001) }, "FRESH_AUTH_REQUIRED"],
    [{ sessionCreatedAt: new Date(now.getTime() + 60_000) }, "FRESH_AUTH_REQUIRED"],
    [{ sessionCreatedAt: new Date(input.sessionCreatedAt.getTime() - 1) }, "FRESH_AUTH_REQUIRED"],
    [{ proofState: "pending" }, "INVALID_PHONE_PROOF"],
    [{ proofPolicy: "unapproved" }, "INVALID_PHONE_PROOF"],
    [{ proofExpiry: new Date(0) }, "INVALID_PHONE_PROOF"],
    [{ insertFailure: true }, "PHONE_CONFLICT"],
  ] as const) {
    const { repository, calls } = fixture(options);
    await assert.rejects(repository.bind(input), { code });
    assert.equal(calls.at(-1), "ROLLBACK");
  }
});

test("canonical reads and durable rate limits reject invalid identities and bound overuse", async () => {
  let rows: unknown[] = [];
  const queries: string[] = [];
  const repository = new PgPayloadMemberRepository({ query: async (sql: string) => {
    queries.push(sql); return { rows };
  } } as unknown as Pool);
  assert.equal(await repository.getBinding("retired-user"), null);
  assert.equal(await repository.isActiveMember("retired-user"), false);
  assert.equal(queries.length, 0);
  assert.equal(await repository.getBinding(userId), null);
  assert.equal(await repository.isActiveMember(userId), false);
  assert.equal(await repository.findBoundUserByPhoneHash(input.phoneHash), null);
  rows = [existing];
  assert.equal((await repository.getBinding(userId))?.userId, userId);
  assert.equal(await repository.isActiveMember(userId), true);
  rows = [{ userId, name: "Canonical", email: "member@fixture.invalid" }];
  assert.deepEqual(await repository.findBoundUserByPhoneHash(input.phoneHash), rows[0]);
  rows = [{ attempts: 1 }];
  await repository.enforceBindRate({ keyHash: "rate-key", now });
  rows = [{ attempts: 6 }];
  await assert.rejects(repository.enforceBindRate({ keyHash: "rate-key", now }), { code: "RATE_LIMITED" });
  rows = [];
  await assert.rejects(repository.enforceBindRate({ keyHash: "rate-key", now }), { code: "RATE_LIMITED" });
  assert.ok(queries.every((sql) => !sql.includes('member_auth."user"')));
});
