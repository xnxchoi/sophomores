import { z } from "zod";
import type { Pool, PoolClient } from "pg";
import { MemberError, type BindRecord, type BoundMember, type MemberBinding, type MemberBindingRepository } from "./contracts";

const POLICY = "local-skt-zoho-arc-v1";
const canonicalIdentity = z.uuid();
type BindingRow = { user_id: string; phone_hash: string; challenge_id: string; policy_version: string; verified_at: Date };
type SessionRow = { email_verified: boolean; session_created_at: Date; expires_at: Date };
type ChallengeRow = { state: string; created_at: Date; expires_at: Date; policy_version: string | null };
const binding = (row: BindingRow): MemberBinding => ({ userId: row.user_id, challengeId: row.challenge_id,
  policyVersion: row.policy_version, verifiedAt: row.verified_at });

/** pg is the installed transaction boundary; no library combines these domain locks/proofs. */
export class PgPayloadMemberRepository implements MemberBindingRepository {
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

  async enforceBindRate(input: { keyHash: string; now: Date }): Promise<void> {
    const result = await this.pool.query<{ attempts: number }>(`INSERT INTO canonical_member.bind_limits (key_hash,window_started_at,attempts,expires_at)
      VALUES ($1,$2,1,$3) ON CONFLICT (key_hash) DO UPDATE SET
      attempts=CASE WHEN canonical_member.bind_limits.expires_at <= $2 THEN 1 ELSE canonical_member.bind_limits.attempts+1 END,
      window_started_at=CASE WHEN canonical_member.bind_limits.expires_at <= $2 THEN $2 ELSE canonical_member.bind_limits.window_started_at END,
      expires_at=CASE WHEN canonical_member.bind_limits.expires_at <= $2 THEN $3 ELSE canonical_member.bind_limits.expires_at END
      RETURNING attempts`, [input.keyHash, input.now, new Date(input.now.getTime() + 60_000)]);
    if (!result.rows[0] || result.rows[0].attempts > 5) throw new MemberError("RATE_LIMITED");
  }

  private async lockIdentity(client: PoolClient, input: BindRecord): Promise<SessionRow> {
    for (const key of [`canonical-member-user:${input.userId}`, `canonical-member-phone:${input.phoneHash}`].sort()) {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [key]);
    }
    const result = await client.query<SessionRow>(`SELECT u.email_verified,s.created_at AS session_created_at,s.expires_at
      FROM public.users u JOIN public.sessions s ON s.user_id=u.id
      WHERE u.id=$1 AND s.id=$2 FOR UPDATE OF u,s`, [input.userId, input.sessionId]);
    const row = result.rows[0];
    if (!row) throw new MemberError("UNAUTHENTICATED");
    if (row.email_verified !== true) throw new MemberError("EMAIL_REQUIRED");
    return row;
  }

  private assertSession(input: BindRecord, session: SessionRow, now: Date): void {
    if (!(session.expires_at instanceof Date) || session.expires_at <= now) throw new MemberError("UNAUTHENTICATED");
    const age = now.getTime() - session.session_created_at.getTime();
    if (!Number.isFinite(age) || age < 0 || age > 900_000
      || session.session_created_at.getTime() !== input.sessionCreatedAt.getTime()) throw new MemberError("FRESH_AUTH_REQUIRED");
  }

  private async existingBinding(client: PoolClient, input: BindRecord): Promise<MemberBinding | null> {
    const result = await client.query<BindingRow>(`SELECT user_id,phone_hash,challenge_id,policy_version,verified_at
      FROM canonical_member.phone_bindings WHERE user_id=$1 OR phone_hash=$2 OR challenge_id=$3 ORDER BY user_id FOR UPDATE`,
    [input.userId, input.phoneHash, input.challengeId]);
    if (!result.rows.length) return null;
    const row = result.rows[0];
    if (result.rows.length !== 1 || row.user_id !== input.userId || row.phone_hash !== input.phoneHash
      || row.challenge_id !== input.challengeId || row.policy_version !== POLICY) throw new MemberError("PHONE_CONFLICT");
    const proof = await client.query<{ state: string }>(`SELECT state FROM phone_verification.challenges
      WHERE id=$1 AND session_hash=$2 AND phone_hash=$3 FOR UPDATE`, [input.challengeId, input.sessionHash, input.phoneHash]);
    if (proof.rows[0]?.state !== "consumed") throw new MemberError("INVALID_PHONE_PROOF");
    return binding(row);
  }

  async bind(input: BindRecord): Promise<MemberBinding> {
    if (!canonicalIdentity.safeParse(input.userId).success || !canonicalIdentity.safeParse(input.sessionId).success) {
      throw new MemberError("UNAUTHENTICATED");
    }
    const start = process.hrtime.bigint();
    const now = () => new Date(input.now.getTime() + Number((process.hrtime.bigint() - start) / 1_000_000n));
    return this.transaction(async (client) => {
      const session = await this.lockIdentity(client, input);
      this.assertSession(input, session, now());
      const existing = await this.existingBinding(client, input);
      if (existing) { this.assertSession(input, session, now()); return existing; }
      const proof = await client.query<ChallengeRow>(`SELECT state,created_at,expires_at,policy_version FROM phone_verification.challenges
        WHERE id=$1 AND session_hash=$2 AND phone_hash=$3 FOR UPDATE`, [input.challengeId, input.sessionHash, input.phoneHash]);
      const current = now();
      this.assertSession(input, session, current);
      const row = proof.rows[0];
      if (!row || row.state !== "verified" || row.policy_version !== POLICY
        || row.created_at < session.session_created_at || row.created_at > current || row.expires_at <= current) {
        throw new MemberError("INVALID_PHONE_PROOF");
      }
      const inserted = await client.query<BindingRow>(`INSERT INTO canonical_member.phone_bindings
        (user_id,phone_hash,challenge_id,policy_version,verified_at) VALUES ($1,$2,$3,$4,$5)
        RETURNING user_id,phone_hash,challenge_id,policy_version,verified_at`,
      [input.userId, input.phoneHash, input.challengeId, POLICY, current]);
      const consumed = await client.query(`UPDATE phone_verification.challenges SET state='consumed'
        WHERE id=$1 AND state='verified' AND expires_at>$2 RETURNING id`, [input.challengeId, now()]);
      if (consumed.rowCount !== 1) throw new MemberError("INVALID_PHONE_PROOF");
      this.assertSession(input, session, now());
      return binding(inserted.rows[0]);
    });
  }

  async getBinding(userId: string): Promise<MemberBinding | null> {
    if (!canonicalIdentity.safeParse(userId).success) return null;
    const result = await this.pool.query<BindingRow>(`SELECT user_id,phone_hash,challenge_id,policy_version,verified_at
      FROM canonical_member.phone_bindings WHERE user_id=$1`, [userId]);
    return result.rows[0] ? binding(result.rows[0]) : null;
  }

  async isActiveMember(userId: string): Promise<boolean> {
    if (!canonicalIdentity.safeParse(userId).success) return false;
    const result = await this.pool.query(`SELECT b.user_id FROM canonical_member.phone_bindings b
      JOIN public.users u ON u.id=b.user_id WHERE b.user_id=$1 AND u.email_verified=true AND b.policy_version=$2`, [userId, POLICY]);
    return result.rows.length === 1;
  }

  async findBoundUserByPhoneHash(phoneHash: string): Promise<BoundMember | null> {
    const result = await this.pool.query<BoundMember>(`SELECT u.id AS "userId",u.email,u.name FROM canonical_member.phone_bindings b
      JOIN public.users u ON u.id=b.user_id WHERE b.phone_hash=$1 AND u.email_verified=true AND b.policy_version=$2`, [phoneHash, POLICY]);
    return result.rows[0] ?? null;
  }
}
