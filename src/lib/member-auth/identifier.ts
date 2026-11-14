import { timingSafeEqual } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { productionOrigin } from "../phone-verification/server/config";
import { digest, normalizePhone, randomToken } from "../phone-verification/server/crypto";

export const IDENTIFIER_COOKIE = "sophomores-phone-identifier";
type IdentifierErrorCode = "INVALID_INPUT" | "IDENTIFIER_MISMATCH" | "RATE_LIMITED" | "UNAVAILABLE";
export class IdentifierError extends Error {
  constructor(readonly code: IdentifierErrorCode) {
    super("The phone identifier request could not be completed.");
    this.name = "IdentifierError";
  }
}
type IdentifierOptions = {
  verificationSecret: string;
  secret: string;
  origin: string;
  /** Explicit opt-in to the https production origin; the default accepts only http://localhost. */
  production?: boolean;
  now?: () => Date;
  /** Closed internal choice: canonical tables never read retired pilot bindings. */
  schema?: "member_auth" | "canonical_member";
};

export function identifierCookieToken(headers: Headers): string | null {
  const raw = headers.get("cookie") ?? "";
  if (raw.length > 8192) throw new IdentifierError("IDENTIFIER_MISMATCH");
  const values = raw.split(";").map((part) => part.trim()).filter((part) => part.startsWith(`${IDENTIFIER_COOKIE}=`));
  if (!values.length) return null;
  const token = values[0].slice(IDENTIFIER_COOKIE.length + 1);
  if (values.length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new IdentifierError("IDENTIFIER_MISMATCH");
  return token;
}

function requireToken(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new IdentifierError("INVALID_INPUT");
  return value;
}
function sameHash(first: unknown, second: unknown): boolean {
  return typeof first === "string" && typeof second === "string"
    && /^[a-f0-9]{64}$/.test(first) && /^[a-f0-9]{64}$/.test(second)
    && timingSafeEqual(Buffer.from(first, "hex"), Buffer.from(second, "hex"));
}

/** An account-selection constraint only: possession of this cookie never authenticates. */
export class PgPhoneIdentifier {
  private readonly options: Readonly<IdentifierOptions>;
  private readonly schema: "member_auth" | "canonical_member";
  constructor(private readonly pool: Pool, options: IdentifierOptions) {
    const origin = new URL(options.origin);
    if (!(options.production ? productionOrigin(options.origin) === options.origin : origin.protocol === "http:" && origin.hostname === "localhost")
      || origin.origin !== options.origin
      || origin.username || origin.password || options.secret.length < 32 || options.verificationSecret.length < 32
      || options.secret === options.verificationSecret) throw new IdentifierError("INVALID_INPUT");
    this.options = Object.freeze({ ...options });
    this.schema = options.schema ?? "member_auth";
    if (!["member_auth", "canonical_member"].includes(this.schema)) throw new IdentifierError("INVALID_INPUT");
  }
  private now(): Date {
    const value = this.options.now?.() ?? new Date();
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new IdentifierError("UNAVAILABLE");
    return new Date(value);
  }
  private tokenHash(token: string): string {
    return digest(this.options.secret, "member-phone-identifier-token", token);
  }
  private async storage<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error) { throw error instanceof IdentifierError ? error : new IdentifierError("UNAVAILABLE"); }
  }
  private async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.storage(async () => {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        const result = await operation(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        try { await client.query("ROLLBACK"); }
        catch { throw new IdentifierError("UNAVAILABLE"); }
        throw error;
      } finally { client.release(); }
    });
  }
  async migrate(): Promise<void> {
    await this.storage(async () => {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.schema}.phone_login_intents (
          token_hash text PRIMARY KEY,
          phone_hash text NOT NULL,
          created_at timestamptz NOT NULL,
          expires_at timestamptz NOT NULL CHECK (expires_at > created_at)
        );
        CREATE INDEX IF NOT EXISTS phone_login_intents_expiry_idx ON ${this.schema}.phone_login_intents(expires_at);
        CREATE TABLE IF NOT EXISTS ${this.schema}.phone_identifier_limits (
          key_hash text PRIMARY KEY,
          window_started_at timestamptz NOT NULL,
          attempts integer NOT NULL CHECK (attempts > 0),
          expires_at timestamptz NOT NULL
        );
        CREATE INDEX IF NOT EXISTS phone_identifier_limits_expiry_idx ON ${this.schema}.phone_identifier_limits(expires_at);
      `);
    });
  }
  private async takeLimit(client: PoolClient, key: string, maximum: number, now: Date): Promise<void> {
    const result = await client.query<{ attempts: number }>(
      `INSERT INTO ${this.schema}.phone_identifier_limits (key_hash,window_started_at,attempts,expires_at)
       VALUES ($1,$2,1,$3) ON CONFLICT (key_hash) DO UPDATE SET
       window_started_at=CASE WHEN phone_identifier_limits.expires_at <= $2 THEN $2 ELSE phone_identifier_limits.window_started_at END,
       attempts=CASE WHEN phone_identifier_limits.expires_at <= $2 THEN 1 ELSE phone_identifier_limits.attempts+1 END,
       expires_at=CASE WHEN phone_identifier_limits.expires_at <= $2 THEN $3 ELSE phone_identifier_limits.expires_at END
       RETURNING attempts`,
      [digest(this.options.secret, "member-phone-identifier-rate", key), now, new Date(now.getTime() + 60_000)]
    );
    if (!result.rows[0] || result.rows[0].attempts > maximum) throw new IdentifierError("RATE_LIMITED");
  }
  async start(phone: string, ipKey: string): Promise<{ token: string }> {
    let normalized: string;
    try { normalized = normalizePhone(phone); }
    catch { throw new IdentifierError("INVALID_INPUT"); }
    if (typeof ipKey !== "string" || !ipKey || ipKey.length > 256) throw new IdentifierError("INVALID_INPUT");
    const phoneHash = digest(this.options.verificationSecret, "phone", normalized);
    const token = randomToken();
    await this.transaction(async (client) => {
      const now = this.now();
      await this.takeLimit(client, `ip:${ipKey}`, 20, now);
      await this.takeLimit(client, `phone:${phoneHash}`, 5, now);
      await client.query(
        `INSERT INTO ${this.schema}.phone_login_intents (token_hash,phone_hash,created_at,expires_at) VALUES ($1,$2,$3,$4)`,
        [this.tokenHash(token), phoneHash, now, new Date(now.getTime() + 300_000)]
      );
      await client.query(`DELETE FROM ${this.schema}.phone_login_intents WHERE token_hash IN (SELECT token_hash FROM ${this.schema}.phone_login_intents WHERE expires_at <= $1 LIMIT 100)`, [now]);
      await client.query(`DELETE FROM ${this.schema}.phone_identifier_limits WHERE key_hash IN (SELECT key_hash FROM ${this.schema}.phone_identifier_limits WHERE expires_at <= $1 LIMIT 100)`, [now]);
    });
    return { token };
  }
  async clear(value: string): Promise<void> {
    const token = requireToken(value);
    await this.storage(async () => {
      await this.pool.query(`DELETE FROM ${this.schema}.phone_login_intents WHERE token_hash=$1`, [this.tokenHash(token)]);
    });
  }
  async assert(headers: Headers, userId: string): Promise<void> {
    const token = identifierCookieToken(headers);
    if (!token) return;
    if (typeof userId !== "string" || !/^[A-Za-z0-9_.-]{1,128}$/.test(userId)) throw new IdentifierError("IDENTIFIER_MISMATCH");
    await this.storage(async () => {
      const result = await this.pool.query<{ phone_hash: string; bound_phone_hash: string | null; expires_at: Date }>(
        `SELECT i.phone_hash,i.expires_at,b.phone_hash AS bound_phone_hash
         FROM ${this.schema}.phone_login_intents i LEFT JOIN ${this.schema}.phone_bindings b ON b.user_id=$2
         WHERE i.token_hash=$1`, [this.tokenHash(token), userId]
      );
      const row = result.rows[0];
      if (!row || !(row.expires_at instanceof Date) || row.expires_at <= this.now()
        || !Number.isFinite(row.expires_at.getTime()) || !sameHash(row.phone_hash, row.bound_phone_hash)) {
        throw new IdentifierError("IDENTIFIER_MISMATCH");
      }
    });
  }
}
