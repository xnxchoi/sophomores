import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { after, afterEach, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import type { MigrateUpArgs, MigrateDownArgs } from "@payloadcms/db-postgres";
import { up, down } from "@/lib/migrations/20261102_000000_recovery_intake";
import type { RecoverySubmission } from "@/lib/member-auth/recovery/contracts";
import { createRecoveryHandlers } from "@/lib/member-auth/recovery/http";
import { PgRecoveryRepository } from "@/lib/member-auth/recovery/repository";
import { RecoveryService } from "@/lib/member-auth/recovery/service";

// Explicit local opt-in. Never starts Docker, migrates, resets, or sends mail.
// Tests own their UUIDs and HMAC keys; cleanup does not remove other requests.
const url = process.env.RECOVERY_TEST_DATABASE_URL;
if (url) {
  const target = new URL(url);
  if (
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
    target.search ||
    target.hash ||
    process.env.NODE_ENV === "production" ||
    !process.env.DATABASE_URI ||
    new URL(process.env.DATABASE_URI).href !== target.href
  ) {
    throw new Error(
      "Recovery tests require the explicitly selected local Payload database."
    );
  }
}
const pool = url
  ? new Pool({
      connectionString: url,
      max: 6,
      connectionTimeoutMillis: 2000,
      statement_timeout: 5000,
      lock_timeout: 1000,
      query_timeout: 6000,
      allowExitOnIdle: true
    })
  : null;
const repository = pool ? new PgRecoveryRepository(pool) : null;
let ids: string[] = [];
let keys: string[] = [];
function track(input: RecoverySubmission) {
  ids = [...ids, input.id];
  keys = [...keys, ...input.keys];
  return input;
}
function fixture(options: { now?: Date; keys?: readonly string[] } = {}) {
  const id = randomUUID();
  const now = options.now ?? new Date();
  return track({
    id,
    phone: "01000000000",
    contactEmail: `${id}@example.invalid`,
    keys:
      options.keys ??
      ["global", "phone", "email"].map((scope) =>
        createHash("sha256").update(`${scope}:${id}`).digest("hex")
      ),
    now,
    expiresAt: new Date(now.getTime() + 30 * 86400_000)
  });
}
afterEach(async () => {
  if (!pool) return;
  try {
    await pool.query(
      "DELETE FROM public.account_recovery_requests WHERE id=ANY($1::uuid[])",
      [ids]
    );
    await pool.query(
      "DELETE FROM canonical_member.recovery_intake_limits WHERE key_hash=ANY($1::text[])",
      [keys]
    );
  } finally {
    ids = [];
    keys = [];
  }
});
after(async () => {
  await pool?.end();
});

test(
  "PostgreSQL intake commits generic receipt without identity writes",
  { skip: !pool },
  async () => {
    const identityCounts = async () =>
      (
        await pool!.query(`SELECT
    (SELECT count(*) FROM public.users)::int AS users,
    (SELECT count(*) FROM public.sessions)::int AS sessions,
    (SELECT count(*) FROM public.accounts)::int AS accounts,
    (SELECT count(*) FROM canonical_member.phone_bindings)::int AS bindings`)
      ).rows[0];
    const before = await identityCounts();
    const service = new RecoveryService(
      {
        submit: (input) => repository!.submit(track(input)),
        review: (input) => repository!.review(input)
      },
      "fixture-only-recovery-secret".repeat(2)
    );
    const origin = "http://localhost:3000";
    const handlers = createRecoveryHandlers({ origin, service });
    const response = await handlers.submit(
      new Request(`${origin}/api/member/recovery`, {
        method: "POST",
        headers: {
          origin,
          host: "localhost:3000",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          phone: "01000000000",
          contactEmail: `${randomUUID()}@example.invalid`
        })
      })
    );
    assert.equal(response.status, 202);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.deepEqual(await response.json(), {
      success: true,
      data: { status: "pending_staff_review" }
    });
    const stored = (
      await pool!.query(
        "SELECT status,claim_verification,revision FROM public.account_recovery_requests WHERE id=$1",
        [ids[0]]
      )
    ).rows[0];
    assert.deepEqual(stored, {
      status: "submitted",
      claim_verification: "unverified",
      revision: "0"
    });
    assert.deepEqual(await identityCounts(), before);
  }
);

test(
  "PostgreSQL concurrent claim limits admit exactly three and roll back losers",
  { skip: !pool },
  async () => {
    const shared = fixture().keys;
    const inputs = Array.from({ length: 6 }, () => fixture({ keys: shared }));
    const results = await Promise.allSettled(
      inputs.map((input) => repository!.submit(input))
    );
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      3
    );
    for (const result of results)
      if (result.status === "rejected")
        assert.equal(result.reason.code, "RATE_LIMITED");
    const count = await pool!.query(
      "SELECT count(*)::int AS count FROM public.account_recovery_requests WHERE id=ANY($1::uuid[])",
      [inputs.map((input) => input.id)]
    );
    assert.equal(count.rows[0].count, 3);
    const limits = await pool!.query(
      "SELECT attempts FROM canonical_member.recovery_intake_limits WHERE key_hash=ANY($1::text[])",
      [shared]
    );
    assert.equal(limits.rows.length, 3);
    assert.ok(limits.rows.every((row) => row.attempts === 3));
  }
);

test(
  "PostgreSQL review CAS admits one winner and database guards protect claims and audit",
  { skip: !pool },
  async () => {
    const input = fixture();
    await repository!.submit(input);
    const review = {
      id: input.id,
      reviewerId: randomUUID(),
      now: new Date(),
      expectedRevision: 0,
      internalNote: "Synthetic internal review only"
    };
    const results = await Promise.allSettled([
      repository!.review({ ...review, status: "needs_proof" }),
      repository!.review({ ...review, status: "rejected" })
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1
    );
    const loser = results.find((result) => result.status === "rejected");
    assert.equal(loser?.reason.code, "CONFLICT");
    const row = (
      await pool!.query(
        "SELECT revision,review_log,claim_verification FROM public.account_recovery_requests WHERE id=$1",
        [input.id]
      )
    ).rows[0];
    assert.equal(row.revision, "1");
    assert.equal(row.review_log.length, 1);
    assert.equal(row.claim_verification, "unverified");
    await assert.rejects(
      pool!.query(
        "UPDATE public.account_recovery_requests SET contact_email='changed@example.invalid' WHERE id=$1",
        [input.id]
      ),
      /Recovery claims are immutable/
    );
    await assert.rejects(
      pool!.query(
        "UPDATE public.account_recovery_requests SET review_log='[]'::jsonb,revision=2 WHERE id=$1",
        [input.id]
      ),
      /append-only revision/
    );
    await assert.rejects(
      pool!.query(
        "UPDATE public.account_recovery_requests SET status='approved',revision=revision+1,review_log=review_log || '[{}]'::jsonb WHERE id=$1",
        [input.id]
      ),
      /check constraint/
    );
  }
);

test(
  "PostgreSQL expired requests cannot be reviewed and retention removes their private data",
  { skip: !pool },
  async () => {
    const input = fixture({ now: new Date(Date.now() - 31 * 86400_000) });
    // Historical fixture bypasses intake cleanup, not the database constraints.
    await pool!.query(
      `INSERT INTO public.account_recovery_requests
    (id,phone,contact_email,created_at,updated_at,expires_at) VALUES ($1,$2,$3,$4,$4,$5)`,
      [input.id, input.phone, input.contactEmail, input.now, input.expiresAt]
    );
    await assert.rejects(
      repository!.review({
        id: input.id,
        reviewerId: randomUUID(),
        now: new Date(),
        expectedRevision: 0,
        status: "closed",
        internalNote: "Expired fixture"
      }),
      { code: "CONFLICT" }
    );
    await repository!.cleanup();
    assert.equal(
      (
        await pool!.query(
          "SELECT id FROM public.account_recovery_requests WHERE id=$1",
          [input.id]
        )
      ).rowCount,
      0
    );
  }
);

test(
  "PostgreSQL migration down/up is reversible inside a rolled-back transaction",
  { skip: !pool },
  async () => {
    const client = await pool!.connect();
    // Use the installed adapter's own Drizzle dialect to execute the actual exported
    // migration functions. No extracted SQL, copied migration, or new dependency.
    const require = createRequire(import.meta.url);
    const adapterRequire = createRequire(
      require.resolve("@payloadcms/db-postgres")
    );
    const { PgDialect } = adapterRequire("drizzle-orm/pg-core");
    const dialect = new PgDialect();
    const db = {
      execute: async (
        query: Parameters<InstanceType<typeof PgDialect>["sqlToQuery"]>[0]
      ) => {
        const compiled = dialect.sqlToQuery(query);
        return client.query(compiled.sql, compiled.params);
      }
    };
    await client.query("BEGIN");
    try {
      await client.query(
        "SET LOCAL lock_timeout='1000ms'; SET LOCAL statement_timeout='5000ms'"
      );
      await down({ db } as unknown as MigrateDownArgs);
      assert.equal(
        (
          await client.query(
            "SELECT to_regclass('public.account_recovery_requests') AS table"
          )
        ).rows[0].table,
        null
      );
      await up({ db } as unknown as MigrateUpArgs);
      assert.ok(
        (
          await client.query(
            "SELECT to_regclass('public.account_recovery_requests') AS table"
          )
        ).rows[0].table
      );
      assert.equal(
        (
          await client.query(
            "SELECT count(*)::int AS count FROM pg_trigger WHERE tgname='recovery_claims_immutable'"
          )
        ).rows[0].count,
        1
      );
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
    assert.ok(
      (
        await pool!.query(
          "SELECT to_regclass('public.account_recovery_requests') AS table"
        )
      ).rows[0].table
    );
  }
);

test(
  "PostgreSQL review rechecks expiry after waiting for a row lock",
  { skip: !pool },
  async () => {
    const input = fixture({ now: new Date(Date.now() - 30 * 86400_000 + 250) });
    await pool!.query(
      `INSERT INTO public.account_recovery_requests
    (id,phone,contact_email,created_at,updated_at,expires_at) VALUES ($1,$2,$3,$4,$4,$5)`,
      [input.id, input.phone, input.contactEmail, input.now, input.expiresAt]
    );
    const blocker = await pool!.connect();
    await blocker.query("BEGIN");
    try {
      await blocker.query(
        "SELECT id FROM public.account_recovery_requests WHERE id=$1 FOR UPDATE",
        [input.id]
      );
      const review = repository!
        .review({
          id: input.id,
          reviewerId: randomUUID(),
          now: new Date(),
          expectedRevision: 0,
          status: "closed",
          internalNote: "Must expire while blocked"
        })
        .then(
          (value) => ({ value, error: undefined }),
          (error: unknown) => ({ value: undefined, error })
        );
      await delay(350);
      await blocker.query("COMMIT");
      const result = await review;
      assert.equal((result.error as { code?: string })?.code, "CONFLICT");
      const row = (
        await pool!.query(
          "SELECT revision,review_log FROM public.account_recovery_requests WHERE id=$1",
          [input.id]
        )
      ).rows[0];
      assert.equal(row.revision, "0");
      assert.deepEqual(row.review_log, []);
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
    }
  }
);
