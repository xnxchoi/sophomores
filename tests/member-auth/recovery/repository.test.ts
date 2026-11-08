import assert from "node:assert/strict";
import test from "node:test";
import { PgRecoveryRepository } from "@/lib/member-auth/recovery/repository";
import { RecoveryService } from "@/lib/member-auth/recovery/service";
import { RecoveryError } from "@/lib/member-auth/recovery/contracts";

const input = {
  id: "019a4000-0000-7000-8000-000000000001",
  phone: "01012345678",
  contactEmail: "claim@example.com",
  keys: ["g", "p", "e"],
  now: new Date(),
  expiresAt: new Date(Date.now() + 30 * 86400_000)
};
function mockPool({
  attempts = 1,
  capacity = 0,
  rows = [{ revision: 1 }]
}: { attempts?: number; capacity?: number; rows?: unknown[] } = {}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  let released = false;
  const query = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    return {
      rows: sql.includes("count(*)")
        ? [{ count: String(capacity) }]
        : sql.includes("clock_timestamp()")
          ? [{ now: new Date() }]
          : sql.includes("RETURNING attempts")
            ? [{ attempts }]
            : sql.startsWith("UPDATE")
              ? rows
              : [],
      rowCount: 0
    };
  };
  return {
    calls,
    released: () => released,
    pool: {
      connect: async () => ({
        query,
        release: () => {
          released = true;
        }
      }),
      query
    } as unknown as ConstructorParameters<typeof PgRecoveryRepository>[0]
  };
}
test("intake atomically locks, bounds retention/capacity, limits all scopes, inserts claims then commits", async () => {
  const mock = mockPool();
  await new PgRecoveryRepository(mock.pool).submit(input);
  assert.equal(mock.calls[0].sql, "BEGIN");
  assert.match(mock.calls[2].sql, /pg_advisory_xact_lock/);
  assert.equal(
    mock.calls.filter((c) => c.sql.includes("RETURNING attempts")).length,
    3
  );
  assert.match(mock.calls[3].sql, /LIMIT 50/);
  const insert = mock.calls.find((c) =>
    c.sql.startsWith("INSERT INTO public.account_recovery_requests")
  )!;
  assert.match(insert.sql, /'unverified','lost_email','submitted'/);
  assert.deepEqual(insert.values, [
    input.id,
    input.phone,
    input.contactEmail,
    input.now,
    input.expiresAt
  ]);
  assert.equal(mock.calls.at(-1)?.sql, "COMMIT");
  assert.equal(mock.released(), true);
  assert.ok(
    mock.calls.every(
      (c) =>
        !/(public\.(users|accounts|sessions)|phone_bindings|member_auth\.)/.test(
          c.sql
        )
    )
  );
});
test("per-claim rate rejection and global capacity rollback every mutation", async () => {
  for (const options of [{ attempts: 4 }, { capacity: 1000 }]) {
    const mock = mockPool(options);
    await assert.rejects(
      () => new PgRecoveryRepository(mock.pool).submit(input),
      (error: unknown) =>
        error instanceof RecoveryError && error.code === "RATE_LIMITED"
    );
    assert.equal(mock.calls.at(-1)?.sql, "ROLLBACK");
    assert.equal(mock.released(), true);
    assert.equal(
      mock.calls.some((c) =>
        c.sql.startsWith("INSERT INTO public.account_recovery_requests")
      ),
      false
    );
  }
});
test("review uses atomic revision CAS, bounded append-only audit and no identity writes", async () => {
  const mock = mockPool();
  const repo = new PgRecoveryRepository(mock.pool);
  const review = {
    id: input.id,
    reviewerId: input.id,
    now: input.now,
    expectedRevision: 0,
    status: "needs_proof" as const,
    internalNote: "Must obtain independent proof"
  };
  assert.equal(await repo.review(review), 1);
  const update = mock.calls.find((call) => call.sql.startsWith("UPDATE"))!;
  assert.match(mock.calls[2].sql, /FOR UPDATE/);
  assert.match(mock.calls[3].sql, /clock_timestamp/);
  assert.match(update.sql, /revision=\$7 AND revision<100 AND expires_at>\$4/);
  assert.match(update.sql, /review_log=review_log \|\| \$5::jsonb/);
  const stale = mockPool({ rows: [] });
  await assert.rejects(
    () => new PgRecoveryRepository(stale.pool).review(review),
    (error: unknown) =>
      error instanceof RecoveryError && error.code === "CONFLICT"
  );
});
test("service normalizes only unverified claims and uses separated HMAC scopes", async () => {
  let saved: typeof input | undefined;
  const service = new RecoveryService(
    {
      submit: async (value) => {
        saved = { ...value, keys: [...value.keys] };
      },
      review: async () => 1
    },
    "secret".repeat(8)
  );
  await service.submit({
    phone: "+82 10-1234-5678",
    contactEmail: "Claim@Example.com"
  });
  assert.equal(saved?.phone, "01012345678");
  assert.equal(saved?.contactEmail, "claim@example.com");
  assert.equal(new Set(saved?.keys).size, 3);
  assert.ok(saved?.keys.every((k) => /^[a-f0-9]{64}$/.test(k)));
  assert.equal(
    saved!.expiresAt.getTime() - saved!.now.getTime(),
    30 * 86400_000
  );
  await assert.rejects(
    () =>
      service.review(
        input.id,
        { expectedRevision: 0, status: "approved", internalNote: "bad" },
        {
          collection: "admins",
          _strategy: "staff-better-auth",
          role: "admin",
          id: input.id
        }
      ),
    /INVALID_INPUT/
  );
  await assert.rejects(
    () =>
      service.review(
        input.id,
        { expectedRevision: 0, status: "closed", internalNote: "bad" },
        {
          collection: "admins",
          _strategy: "staff-better-auth",
          role: "staff",
          id: input.id
        }
      ),
    /FORBIDDEN/
  );
});
