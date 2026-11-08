import type { Pool, PoolClient } from "pg";
import { MemberError, type BindRecord, type BoundMember, type MemberBinding, type MemberBindingRepository } from "./contracts";

type BindingRow = { user_id: string; phone_hash: string; challenge_id: string; policy_version: string; verified_at: Date };
type ChallengeRow = { id: string; state: string; created_at: Date; expires_at: Date; policy_version: string | null };
const POLICY = "local-skt-zoho-arc-v1";
const binding = (row: BindingRow): MemberBinding => ({ userId: row.user_id, challengeId: row.challenge_id, policyVersion: row.policy_version, verifiedAt: row.verified_at });

function advancingClock(base: Date) {
  const start = process.hrtime.bigint();
  return () => new Date(base.getTime() + Number((process.hrtime.bigint() - start) / 1_000_000n));
}
function freshSession(input: BindRecord, now: Date): void {
  const age = now.getTime() - input.sessionCreatedAt.getTime();
  if (!Number.isFinite(age) || age < 0 || age > 900_000) throw new MemberError("FRESH_AUTH_REQUIRED");
}

export class PgMemberRepository implements MemberBindingRepository {
  constructor(private readonly pool: Pool) {}
  private async transaction<T>(action: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout='1000ms'; SET LOCAL statement_timeout='5000ms'");
      const result = await action(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      if (error && typeof error === "object" && "code" in error && error.code === "23505") throw new MemberError("PHONE_CONFLICT");
      throw error;
    } finally { client.release(); }
  }
  async migrate(): Promise<void> {
    await this.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('member-phone-binding-migration',0))");
      await client.query(`CREATE SCHEMA IF NOT EXISTS member_auth;
        CREATE TABLE IF NOT EXISTS member_auth.phone_bindings (
          user_id text PRIMARY KEY REFERENCES member_auth."user"(id) ON DELETE CASCADE,
          phone_hash text NOT NULL UNIQUE,
          challenge_id uuid NOT NULL UNIQUE,
          policy_version text NOT NULL,
          verified_at timestamptz NOT NULL
        );
        CREATE TABLE IF NOT EXISTS member_auth.bind_limits (
          key_hash text PRIMARY KEY,
          window_started_at timestamptz NOT NULL,
          attempts integer NOT NULL CHECK (attempts > 0),
          expires_at timestamptz NOT NULL
        )`);
    });
  }
  async enforceBindRate(input: { keyHash: string; now: Date }): Promise<void> {
    const result = await this.pool.query<{ attempts: number }>(`INSERT INTO member_auth.bind_limits (key_hash,window_started_at,attempts,expires_at)
      VALUES ($1,$2,1,$3) ON CONFLICT (key_hash) DO UPDATE SET
      attempts=CASE WHEN member_auth.bind_limits.expires_at <= $2 THEN 1 ELSE member_auth.bind_limits.attempts+1 END,
      window_started_at=CASE WHEN member_auth.bind_limits.expires_at <= $2 THEN $2 ELSE member_auth.bind_limits.window_started_at END,
      expires_at=CASE WHEN member_auth.bind_limits.expires_at <= $2 THEN $3 ELSE member_auth.bind_limits.expires_at END
      RETURNING attempts`, [input.keyHash, input.now, new Date(input.now.getTime() + 60_000)]);
    if (!result.rows[0] || result.rows[0].attempts > 5) throw new MemberError("RATE_LIMITED");
  }
  private async lockIdentity(client: PoolClient, input: BindRecord): Promise<void> {
    for (const key of [`member-user:${input.userId}`, `member-phone:${input.phoneHash}`].sort()) await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [key]);
    const user = await client.query<{ emailVerified: boolean }>('SELECT id,"emailVerified" FROM member_auth."user" WHERE id=$1 FOR UPDATE', [input.userId]);
    if (!user.rows[0]) throw new MemberError("UNAUTHENTICATED");
    if (user.rows[0].emailVerified !== true) throw new MemberError("EMAIL_REQUIRED");
  }
  private async existingBinding(client: PoolClient, input: BindRecord): Promise<MemberBinding | null> {
    const result = await client.query<BindingRow>(`SELECT user_id,phone_hash,challenge_id,policy_version,verified_at FROM member_auth.phone_bindings
      WHERE user_id=$1 OR phone_hash=$2 OR challenge_id=$3 ORDER BY user_id FOR UPDATE`, [input.userId, input.phoneHash, input.challengeId]);
    if (!result.rows.length) return null;
    const row = result.rows[0];
    if (result.rows.length !== 1 || row.user_id !== input.userId || row.phone_hash !== input.phoneHash || row.challenge_id !== input.challengeId || row.policy_version !== POLICY) throw new MemberError("PHONE_CONFLICT");
    const challenge = await client.query<ChallengeRow>("SELECT id,state FROM phone_verification.challenges WHERE id=$1 AND session_hash=$2 AND phone_hash=$3 AND state='consumed' AND policy_version=$4 FOR UPDATE", [input.challengeId, input.sessionHash, input.phoneHash, POLICY]);
    if (challenge.rows[0]?.state !== "consumed") throw new MemberError("INVALID_PHONE_PROOF");
    return binding(row);
  }
  private async lockChallenge(client: PoolClient, input: BindRecord, currentTime: () => Date): Promise<void> {
    const result = await client.query<ChallengeRow>(`SELECT id,state,created_at,expires_at,policy_version FROM phone_verification.challenges
      WHERE id=$1 AND session_hash=$2 AND phone_hash=$3 FOR UPDATE`, [input.challengeId, input.sessionHash, input.phoneHash]);
    const now = currentTime();
    freshSession(input, now);
    const row = result.rows[0];
    if (!row || row.state !== "verified" || row.policy_version !== POLICY || row.created_at < input.sessionCreatedAt || row.created_at > now || row.expires_at <= now) throw new MemberError("INVALID_PHONE_PROOF");
  }
  async bind(input: BindRecord): Promise<MemberBinding> {
    const currentTime = advancingClock(input.now);
    return this.transaction(async (client) => {
      await this.lockIdentity(client, input);
      freshSession(input, currentTime());
      const existing = await this.existingBinding(client, input);
      if (existing) { freshSession(input, currentTime()); return existing; }
      await this.lockChallenge(client, input, currentTime);
      const inserted = await client.query<BindingRow>(`INSERT INTO member_auth.phone_bindings (user_id,phone_hash,challenge_id,policy_version,verified_at)
        VALUES ($1,$2,$3,$4,$5) RETURNING user_id,phone_hash,challenge_id,policy_version,verified_at`, [input.userId, input.phoneHash, input.challengeId, POLICY, currentTime()]);
      const result = await client.query("UPDATE phone_verification.challenges SET state='consumed' WHERE id=$1 AND state='verified' AND expires_at>$2 RETURNING id", [input.challengeId, currentTime()]);
      if (result.rowCount !== 1) throw new MemberError("INVALID_PHONE_PROOF");
      return binding(inserted.rows[0]);
    });
  }
  async getBinding(userId: string): Promise<MemberBinding | null> {
    const result = await this.pool.query<BindingRow>("SELECT user_id,phone_hash,challenge_id,policy_version,verified_at FROM member_auth.phone_bindings WHERE user_id=$1", [userId]);
    return result.rows[0] ? binding(result.rows[0]) : null;
  }
  async isActiveMember(userId: string): Promise<boolean> {
    const result = await this.pool.query(`SELECT b.user_id FROM member_auth.phone_bindings b JOIN member_auth."user" u ON u.id=b.user_id
      WHERE b.user_id=$1 AND u."emailVerified"=true AND b.policy_version=$2`, [userId, POLICY]);
    return result.rows.length === 1;
  }
  async findBoundUserByPhoneHash(phoneHash: string): Promise<BoundMember | null> {
    const result = await this.pool.query<BoundMember>(`SELECT u.id AS "userId",u.email,u.name FROM member_auth.phone_bindings b JOIN member_auth."user" u ON u.id=b.user_id
      WHERE b.phone_hash=$1 AND u."emailVerified"=true AND b.policy_version=$2`, [phoneHash, POLICY]);
    const row = result.rows[0];
    return row ? { userId: row.userId, email: row.email, name: row.name } : null;
  }
}
