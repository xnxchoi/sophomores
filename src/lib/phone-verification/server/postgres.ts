import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Pool, PoolClient } from "pg";
import {
  type ChallengeRecord,
  type DeliveryLease,
  type DeliveryClaimScope,
  type DeliveryRef,
  type IssueRecord,
  type MatchRecord,
  type MatchResult,
  type VerificationRepository,
  VerificationError
} from "./contracts";
import { requireReference } from "./crypto";

type ChallengeRow = {
  id: string;
  session_hash: string;
  phone_hash: string;
  token_hash: string;
  proof_hash: string;
  state: ChallengeRecord["state"];
  created_at: Date;
  expires_at: Date;
};
type DeliveryRow = {
  id: string;
  mailbox_id: string;
  message_id: string;
  received_at: Date;
  lease_token: string;
  attempts: number;
  matched_at: Date | null;
  state: string;
  lease_until: Date | null;
};
const RETENTION_MS = 86_400_000;
const MAX_ATTEMPTS = 5;

// Advance even an injected domain clock while awaiting PostgreSQL connections/locks.
function advancingClock(base: Date): () => Date {
  const start = process.hrtime.bigint();
  return () =>
    new Date(
      base.getTime() + Number((process.hrtime.bigint() - start) / 1_000_000n)
    );
}

function validatedClaimScope(scope: DeliveryClaimScope): DeliveryClaimScope {
  const numericId = (value: unknown) =>
    typeof value === "string" && /^[1-9][0-9]{0,29}$/.test(value);
  if (
    !scope ||
    typeof scope !== "object" ||
    !numericId(scope.mailboxId) ||
    !Array.isArray(scope.messageIds) ||
    scope.messageIds.length > 60 ||
    !scope.messageIds.every(numericId)
  )
    throw new VerificationError("INVALID_INPUT");
  return {
    mailboxId: scope.mailboxId,
    messageIds: [...new Set(scope.messageIds)]
  };
}

export class PgPhoneVerificationRepository implements VerificationRepository {
  constructor(private readonly pool: Pool) {}
  private async transaction<T>(
    action: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
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
  async migrate(): Promise<void> {
    const sql = await readFile(
      new URL("./migrations/001-phone-verification.sql", import.meta.url),
      "utf8"
    );
    await this.transaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended('phone-verification-migration',0))"
      );
      await client.query(sql);
    });
  }
  async issue(input: IssueRecord): Promise<void> {
    const currentTime = advancingClock(input.createdAt);
    await this.transaction(async (client) => {
      const limits = [
        [input.sessionHash, input.limits.session],
        [input.phoneHash, input.limits.phone],
        [input.ipHash, input.limits.ip]
      ] as const;
      for (const [key] of [...limits].sort(([a], [b]) => a.localeCompare(b)))
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [key]
        );
      for (const [key, cap] of limits)
        await this.incrementLimit(client, key, cap, input);
      await client.query(
        "SELECT id FROM phone_verification.challenges WHERE session_hash=$1 AND state IN ('pending','review','verified') FOR UPDATE",
        [input.sessionHash]
      );
      if (input.expiresAt <= currentTime())
        throw new VerificationError("UNAVAILABLE");
      await client.query(
        "UPDATE phone_verification.challenges SET state='cancelled' WHERE session_hash=$1 AND state IN ('pending','review','verified')",
        [input.sessionHash]
      );
      await client.query(
        "INSERT INTO phone_verification.challenges (id,session_hash,phone_hash,token_hash,proof_hash,state,created_at,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          input.id,
          input.sessionHash,
          input.phoneHash,
          input.tokenHash,
          input.proofHash,
          input.state,
          input.createdAt,
          input.expiresAt
        ]
      );
    });
  }
  private async incrementLimit(
    client: PoolClient,
    key: string,
    cap: number,
    input: IssueRecord
  ) {
    const cutoff = new Date(input.createdAt.getTime() - input.limits.windowMs);
    const expiresAt = new Date(
      input.createdAt.getTime() + input.limits.windowMs
    );
    const result = await client.query(
      `INSERT INTO phone_verification.rate_limits (key_hash,window_started_at,attempts,expires_at) VALUES ($1,$2,1,$3)
      ON CONFLICT (key_hash) DO UPDATE SET attempts=CASE WHEN phone_verification.rate_limits.window_started_at <= $4 THEN 1 ELSE phone_verification.rate_limits.attempts+1 END,
      window_started_at=CASE WHEN phone_verification.rate_limits.window_started_at <= $4 THEN $2 ELSE phone_verification.rate_limits.window_started_at END,
      expires_at=CASE WHEN phone_verification.rate_limits.window_started_at <= $4 THEN $3 ELSE phone_verification.rate_limits.expires_at END RETURNING attempts`,
      [key, input.createdAt, expiresAt, cutoff]
    );
    if (result.rows[0].attempts > cap)
      throw new VerificationError("RATE_LIMITED");
  }
  async findOwned(
    id: string,
    sessionHash: string,
    now: Date
  ): Promise<ChallengeRecord | null> {
    const result = await this.pool.query<ChallengeRow>(
      "SELECT * FROM phone_verification.challenges WHERE id=$1 AND session_hash=$2",
      [id, sessionHash]
    );
    const row = result.rows[0];
    if (!row) return null;
    const state =
      ["pending", "review", "verified"].includes(row.state) &&
      row.expires_at <= now
        ? "expired"
        : row.state;
    return {
      id: row.id,
      sessionHash: row.session_hash,
      phoneHash: row.phone_hash,
      tokenHash: row.token_hash,
      proofHash: row.proof_hash,
      state,
      createdAt: row.created_at,
      expiresAt: row.expires_at
    };
  }
  async cancel(id: string, sessionHash: string, now: Date): Promise<boolean> {
    const result = await this.pool.query(
      "UPDATE phone_verification.challenges SET state=CASE WHEN state IN ('pending','review','verified') THEN CASE WHEN expires_at <= $3 THEN 'expired' ELSE 'cancelled' END ELSE state END WHERE id=$1 AND session_hash=$2",
      [id, sessionHash, now]
    );
    return result.rowCount === 1;
  }
  async match(input: MatchRecord): Promise<MatchResult> {
    const currentTime = advancingClock(input.now);
    return this.transaction(async (client) => {
      await this.insertDelivery(client, input, input.now);
      const result = await client.query<DeliveryRow>(
        "SELECT * FROM phone_verification.deliveries WHERE mailbox_id=$1 AND message_id=$2 FOR UPDATE",
        [input.mailboxId, input.messageId]
      );
      const delivery = result.rows[0];
      if (
        input.deliveryLease &&
        (delivery.id !== input.deliveryLease.id ||
          delivery.state !== "leased" ||
          delivery.lease_token !== input.deliveryLease.leaseToken ||
          !delivery.lease_until ||
          delivery.lease_until <= currentTime())
      )
        return { outcome: "ignored" };
      if (delivery.matched_at) return { outcome: "duplicate" };
      // Acquire the challenge lock before sampling expiry, not in an UPDATE
      // whose predicate may have been evaluated before a long lock wait.
      await client.query(
        "SELECT id FROM phone_verification.challenges WHERE token_hash=$1 AND phone_hash=$2 FOR UPDATE",
        [input.tokenHash, input.phoneHash]
      );
      const now = currentTime();
      if (input.deliveryLease && delivery.lease_until! <= now)
        return { outcome: "ignored" };
      await client.query(
        "UPDATE phone_verification.deliveries SET matched_at=$2,updated_at=$2,state=CASE WHEN $3 THEN state ELSE 'complete' END WHERE id=$1",
        [delivery.id, now, Boolean(input.deliveryLease)]
      );
      const state = input.approved ? "verified" : "review";
      const matched = await client.query(
        `UPDATE phone_verification.challenges SET state=$1,policy_version=$2 WHERE token_hash=$3 AND phone_hash=$4 AND state='pending' AND created_at <= $5 AND expires_at > $5 AND expires_at > $6 AND $5 <= $7 RETURNING id`,
        [
          state,
          input.policyVersion,
          input.tokenHash,
          input.phoneHash,
          input.receivedAt,
          now,
          input.now
        ]
      );
      return matched.rowCount === 1
        ? { outcome: "matched", state }
        : { outcome: "ignored" };
    });
  }
  async consumeProof(input: {
    sessionHash: string;
    phoneHash: string;
    proofHash: string;
    now: Date;
  }): Promise<string | null> {
    const currentTime = advancingClock(input.now);
    return this.transaction(async (client) => {
      await client.query(
        "SELECT id FROM phone_verification.challenges WHERE session_hash=$1 AND phone_hash=$2 AND proof_hash=$3 FOR UPDATE",
        [input.sessionHash, input.phoneHash, input.proofHash]
      );
      const result = await client.query(
        "UPDATE phone_verification.challenges SET state='consumed' WHERE session_hash=$1 AND phone_hash=$2 AND proof_hash=$3 AND state='verified' AND expires_at > $4 RETURNING id",
        [input.sessionHash, input.phoneHash, input.proofHash, currentTime()]
      );
      return result.rows[0]?.id ?? null;
    });
  }
  private async insertDelivery(
    client: PoolClient,
    input: DeliveryRef,
    now: Date
  ): Promise<boolean> {
    const result = await client.query(
      "INSERT INTO phone_verification.deliveries (id,mailbox_id,message_id,received_at,available_at,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$5,$5) ON CONFLICT (mailbox_id,message_id) DO NOTHING",
      [
        randomUUID(),
        input.mailboxId,
        input.messageId,
        input.receivedAt ?? now,
        now
      ]
    );
    return result.rowCount === 1;
  }
  async enqueueDelivery(
    input: DeliveryRef,
    now = new Date()
  ): Promise<boolean> {
    requireReference(input.mailboxId);
    requireReference(input.messageId);
    if (
      input.receivedAt !== undefined &&
      (!(input.receivedAt instanceof Date) ||
        !Number.isFinite(input.receivedAt.getTime()))
    )
      throw new VerificationError("INVALID_INPUT");
    return this.transaction((client) =>
      this.insertDelivery(client, input, now)
    );
  }
  async claimDelivery(
    now = new Date(),
    leaseMs = 30_000,
    scope?: DeliveryClaimScope
  ): Promise<DeliveryLease | null> {
    if (!Number.isSafeInteger(leaseMs) || leaseMs < 100 || leaseMs > 300_000)
      throw new VerificationError("INVALID_INPUT");
    const selection = scope === undefined ? null : validatedClaimScope(scope);
    if (selection && selection.messageIds.length === 0) return null;
    return this.transaction(async (client) => {
      await client.query(
        "UPDATE phone_verification.deliveries SET state='dead',updated_at=$1 WHERE attempts >= $2 AND state IN ('queued','leased') AND (lease_until IS NULL OR lease_until <= $1) AND ($3::text IS NULL OR (mailbox_id=$3 AND message_id=ANY($4::text[])))",
        [
          now,
          MAX_ATTEMPTS,
          selection?.mailboxId ?? null,
          selection?.messageIds ?? []
        ]
      );
      const result = await client.query<DeliveryRow>(
        `WITH candidate AS (SELECT id FROM phone_verification.deliveries WHERE attempts < $4 AND available_at <= $1 AND (state='queued' OR (state='leased' AND lease_until <= $1)) AND ($5::text IS NULL OR (mailbox_id=$5 AND message_id=ANY($6::text[]))) ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1)
        UPDATE phone_verification.deliveries d SET state='leased',lease_token=$2,lease_until=$3,attempts=attempts+1,updated_at=$1 FROM candidate WHERE d.id=candidate.id RETURNING d.*`,
        [
          now,
          randomUUID(),
          new Date(now.getTime() + leaseMs),
          MAX_ATTEMPTS,
          selection?.mailboxId ?? null,
          selection?.messageIds ?? []
        ]
      );
      const row = result.rows[0];
      return row
        ? {
            id: row.id,
            mailboxId: row.mailbox_id,
            messageId: row.message_id,
            receivedAt: row.received_at,
            leaseToken: row.lease_token,
            attempts: row.attempts
          }
        : null;
    });
  }
  async completeDelivery(
    input: Pick<DeliveryLease, "id" | "leaseToken">,
    now = new Date()
  ): Promise<boolean> {
    const result = await this.pool.query(
      "UPDATE phone_verification.deliveries SET state='complete',lease_token=NULL,lease_until=NULL,updated_at=$3 WHERE id=$1 AND lease_token=$2 AND state='leased' AND lease_until > $3",
      [input.id, input.leaseToken, now]
    );
    return result.rowCount === 1;
  }
  async failDelivery(
    input: Pick<DeliveryLease, "id" | "leaseToken">,
    now = new Date()
  ): Promise<boolean> {
    const result = await this.pool.query(
      "UPDATE phone_verification.deliveries SET state=CASE WHEN attempts >= $4 THEN 'dead' ELSE 'queued' END,available_at=$3 + (LEAST(300,POWER(2,attempts)*5)*interval '1 second'),lease_token=NULL,lease_until=NULL,updated_at=$3 WHERE id=$1 AND lease_token=$2 AND state='leased' AND lease_until > $3",
      [input.id, input.leaseToken, now, MAX_ATTEMPTS]
    );
    return result.rowCount === 1;
  }
  async cleanup(now = new Date()): Promise<void> {
    const cutoff = new Date(now.getTime() - RETENTION_MS);
    await this.transaction(async (client) => {
      await client.query(
        "DELETE FROM phone_verification.challenges WHERE id IN (SELECT id FROM phone_verification.challenges WHERE expires_at < $1 LIMIT 1000)",
        [cutoff]
      );
      await client.query(
        "DELETE FROM phone_verification.deliveries WHERE id IN (SELECT id FROM phone_verification.deliveries WHERE created_at < $1 AND (lease_until IS NULL OR lease_until <= $2) LIMIT 1000)",
        [cutoff, now]
      );
      await client.query(
        "DELETE FROM phone_verification.rate_limits WHERE key_hash IN (SELECT key_hash FROM phone_verification.rate_limits WHERE expires_at < $1 LIMIT 1000)",
        [now]
      );
    });
  }
}
