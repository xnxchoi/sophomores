import type { Pool, PoolClient } from "pg";
import {
  RecoveryError,
  type RecoveryRepository,
  type RecoverySubmission,
  type RecoveryReview
} from "./contracts";

export class PgRecoveryRepository implements RecoveryRepository {
  constructor(private readonly pool: Pick<Pool, "connect" | "query">) {}
  // pg has transaction primitives, not a callback transaction API. This local
  // boundary makes rollback and transaction-local DB timeout ownership explicit.
  private async transaction<T>(
    action: (client: Pick<PoolClient, "query" | "release">) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SET LOCAL statement_timeout='5000ms'; SET LOCAL lock_timeout='1000ms'; SET LOCAL idle_in_transaction_session_timeout='10000ms'"
      );
      const result = await action(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async submit(input: RecoverySubmission): Promise<void> {
    await this.transaction(async (client) => {
      // One global transaction lock serializes capacity, all three limits, cleanup
      // and insertion. No account lookup, provider operation or identity write.
      await client.query("SELECT pg_advisory_xact_lock(763402119)");
      await client.query(
        "DELETE FROM public.account_recovery_requests WHERE id IN (SELECT id FROM public.account_recovery_requests WHERE expires_at <= $1 ORDER BY expires_at LIMIT 50)",
        [input.now]
      );
      await client.query(
        "DELETE FROM canonical_member.recovery_intake_limits WHERE key_hash IN (SELECT key_hash FROM canonical_member.recovery_intake_limits WHERE expires_at <= $1 ORDER BY expires_at LIMIT 100)",
        [input.now]
      );
      const capacity = await client.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM public.account_recovery_requests"
      );
      if (Number(capacity.rows[0].count) >= 1000)
        throw new RecoveryError("RATE_LIMITED");
      for (const [index, key] of input.keys.entries()) {
        const limited = await client.query<{ attempts: number }>(
          `INSERT INTO canonical_member.recovery_intake_limits (key_hash,window_started_at,attempts,expires_at) VALUES ($1,$2,1,$2::timestamptz + interval '1 hour') ON CONFLICT (key_hash) DO UPDATE SET window_started_at=CASE WHEN recovery_intake_limits.expires_at <= $2 THEN $2 ELSE recovery_intake_limits.window_started_at END, attempts=CASE WHEN recovery_intake_limits.expires_at <= $2 THEN 1 ELSE recovery_intake_limits.attempts+1 END,expires_at=CASE WHEN recovery_intake_limits.expires_at <= $2 THEN $2::timestamptz+interval '1 hour' ELSE recovery_intake_limits.expires_at END RETURNING attempts`,
          [key, input.now]
        );
        if (limited.rows[0].attempts > (index === 0 ? 100 : 3))
          throw new RecoveryError("RATE_LIMITED");
      }
      await client.query(
        `INSERT INTO public.account_recovery_requests(id,phone,contact_email,claim_verification,reason,status,revision,review_log,created_at,updated_at,expires_at) VALUES ($1,$2,$3,'unverified','lost_email','submitted',0,'[]'::jsonb,$4,$4,$5)`,
        [input.id, input.phone, input.contactEmail, input.now, input.expiresAt]
      );
    });
  }
  async review(
    input: RecoveryReview & { id: string; reviewerId: string; now: Date }
  ): Promise<number> {
    return this.transaction(async (client) => {
      // Lock first, then sample database wall time: expiry must advance while
      // connection acquisition or another review holds this row, not freeze at
      // the request's application timestamp (or transaction-start now()).
      await client.query(
        "SELECT id FROM public.account_recovery_requests WHERE id=$1 FOR UPDATE",
        [input.id]
      );
      const clock = await client.query<{ now: Date }>(
        "SELECT clock_timestamp() AS now"
      );
      const now = clock.rows[0].now;
      const audit = {
        status: input.status,
        note: input.internalNote,
        reviewerId: input.reviewerId,
        at: now.toISOString(),
        revision: input.expectedRevision + 1
      };
      const result = await client.query<{ revision: number }>(
        `UPDATE public.account_recovery_requests SET status=$1,internal_note=$2,reviewer_id=$3,reviewed_at=$4,updated_at=$4,revision=revision+1,review_log=review_log || $5::jsonb WHERE id=$6 AND revision=$7 AND revision<100 AND expires_at>$4 RETURNING revision::integer AS revision`,
        [
          input.status,
          input.internalNote,
          input.reviewerId,
          now,
          JSON.stringify([audit]),
          input.id,
          input.expectedRevision
        ]
      );
      if (!result.rows[0]) throw new RecoveryError("CONFLICT");
      return result.rows[0].revision;
    });
  }
  async cleanup(now = new Date()): Promise<number> {
    return this.transaction(async (client) => {
      const result = await client.query(
        "DELETE FROM public.account_recovery_requests WHERE id IN (SELECT id FROM public.account_recovery_requests WHERE expires_at <= $1 ORDER BY expires_at LIMIT 100)",
        [now]
      );
      await client.query(
        "DELETE FROM canonical_member.recovery_intake_limits WHERE key_hash IN (SELECT key_hash FROM canonical_member.recovery_intake_limits WHERE expires_at <= $1 ORDER BY expires_at LIMIT 100)",
        [now]
      );
      return result.rowCount ?? 0;
    });
  }
}
