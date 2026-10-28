import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { after, before, test } from "node:test";
import { Pool } from "pg";
import { PhoneVerificationService } from "../../lib/phone-verification/server/service";
import { PgPhoneVerificationRepository } from "../../lib/phone-verification/server/postgres";

const url = process.env.PHONE_VERIFICATION_TEST_DATABASE_URL;
function requireIsolatedDatabaseUrl(value: string): void {
  const candidate = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(candidate.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(candidate.hostname) ||
    !/^\/sophomores_verification_(?:local|test(?:_[a-z0-9_]+)?)$/.test(
      candidate.pathname
    ) ||
    candidate.search ||
    candidate.hash
  )
    throw new Error("Tests require an isolated local test database");
}
if (url) requireIsolatedDatabaseUrl(url);
const pool = url ? new Pool({ connectionString: url, max: 12 }) : null;
const repo = pool ? new PgPhoneVerificationRepository(pool) : null;
before(async () => {
  if (repo) await repo.migrate();
});
after(async () => {
  if (pool) await pool.end();
});
const session = () => randomBytes(32).toString("base64url");
const config = {
  secret: randomBytes(32).toString("hex"),
  recipient: "verify@example.test",
  mailboxId: "test-mailbox"
};

test("disposable database guard rejects substring names, non-Postgres, queries, fragments and remote hosts", () => {
  for (const value of [
    "postgres://localhost/contest",
    "postgres://localhost/production_test",
    "https://localhost/sophomores_verification_test",
    "postgres://remote.example/sophomores_verification_test",
    "postgres://localhost/sophomores_verification_test?options=bad",
    "postgres://localhost/sophomores_verification_local#anything"
  ])
    assert.throws(() => requireIsolatedDatabaseUrl(value));
  for (const value of [
    "postgres://127.0.0.1/sophomores_verification_local",
    "postgresql://localhost/sophomores_verification_test_suite"
  ])
    assert.doesNotThrow(() => requireIsolatedDatabaseUrl(value));
});

test(
  "PostgreSQL: expiry is checked after blocked challenge locks and pool acquisition",
  { skip: !repo },
  async () => {
    const now = new Date("2040-01-01T00:00:00Z");
    const service = new PhoneVerificationService(repo!, {
      ...config,
      now: () => now
    });
    const phone = "01077778888";
    const owner = session();
    const candidate = await service.issue({
      sessionToken: owner,
      phone,
      ipKey: owner
    });
    await pool!.query(
      "UPDATE phone_verification.challenges SET expires_at=$2 WHERE id=$1",
      [candidate.id, new Date(now.getTime() + 60)]
    );
    const blocker = await pool!.connect();
    await blocker.query("BEGIN");
    await blocker.query(
      "SELECT id FROM phone_verification.challenges WHERE id=$1 FOR UPDATE",
      [candidate.id]
    );
    let result;
    try {
      const pending = service.match({
        mailboxId: config.mailboxId,
        messageId: session(),
        phone,
        token: candidate.body.split(" ")[1],
        receivedAt: now,
        approved: true,
        policyVersion: "test"
      });
      await delay(120);
      await blocker.query("COMMIT");
      result = await pending;
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
    }
    assert.deepEqual(result, { outcome: "ignored" });

    const proofOwner = session();
    const approved = await service.issue({
      sessionToken: proofOwner,
      phone,
      ipKey: proofOwner
    });
    await service.match({
      mailboxId: config.mailboxId,
      messageId: session(),
      phone,
      token: approved.body.split(" ")[1],
      receivedAt: now,
      approved: true,
      policyVersion: "test"
    });
    const proofToken = (
      await service.status({ sessionToken: proofOwner, id: approved.id })
    ).proofToken!;
    await pool!.query(
      "UPDATE phone_verification.challenges SET expires_at=$2 WHERE id=$1",
      [approved.id, new Date(now.getTime() + 60)]
    );
    const proofBlocker = await pool!.connect();
    await proofBlocker.query("BEGIN");
    await proofBlocker.query(
      "SELECT id FROM phone_verification.challenges WHERE id=$1 FOR UPDATE",
      [approved.id]
    );
    let proofResult;
    try {
      const pending = service
        .consumeProof({ sessionToken: proofOwner, phone, proofToken })
        .then(
          (value) => ({ value }),
          (error) => ({ error })
        );
      await delay(120);
      await proofBlocker.query("COMMIT");
      proofResult = await pending;
    } finally {
      await proofBlocker.query("ROLLBACK");
      proofBlocker.release();
    }
    assert.ok("error" in proofResult);
    assert.equal(proofResult.error.code, "INVALID_PROOF");

    const delayedPool = {
      connect: async () => {
        await delay(1100);
        return pool!.connect();
      }
    } as unknown as Pool;
    const delayed = new PhoneVerificationService(
      new PgPhoneVerificationRepository(delayedPool),
      { ...config, now: () => now, ttlMs: 1000 }
    );
    await assert.rejects(
      delayed.issue({ sessionToken: session(), phone, ipKey: session() }),
      { code: "UNAVAILABLE" }
    );
  }
);

test(
  "PostgreSQL: lease is rechecked after waiting for a different challenge lock",
  { skip: !repo },
  async () => {
    const now = new Date("2041-01-01T00:00:00Z");
    const service = new PhoneVerificationService(repo!, {
      ...config,
      now: () => now
    });
    const sessionToken = session();
    const phone = "01077778888";
    const issued = await service.issue({
      sessionToken,
      phone,
      ipKey: sessionToken
    });
    const ref = {
      mailboxId: config.mailboxId,
      messageId: session(),
      receivedAt: now
    };
    await repo!.enqueueDelivery(ref, now);
    const lease = await repo!.claimDelivery(now, 100);
    assert.ok(lease);
    assert.equal(lease.messageId, ref.messageId);
    const blocker = await pool!.connect();
    await blocker.query("BEGIN");
    await blocker.query(
      "SELECT id FROM phone_verification.challenges WHERE id=$1 FOR UPDATE",
      [issued.id]
    );
    let result;
    try {
      const pending = service.match({
        ...ref,
        phone,
        token: issued.body.split(" ")[1],
        approved: true,
        policyVersion: "test",
        deliveryLease: lease
      });
      await delay(160);
      await blocker.query("COMMIT");
      result = await pending;
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
    }
    assert.deepEqual(result, { outcome: "ignored" });
    assert.equal(
      (await service.status({ sessionToken, id: issued.id })).state,
      "pending"
    );
    await pool!.query(
      "UPDATE phone_verification.deliveries SET state='complete',lease_until=NULL WHERE id=$1",
      [lease.id]
    );
  }
);

test(
  "PostgreSQL: challenge privacy, ownership, review, cancellation, expiry and restart",
  { skip: !repo },
  async () => {
    let now = new Date("2026-10-23T00:00:00Z");
    const service = new PhoneVerificationService(repo!, {
      ...config,
      now: () => now
    });
    const sessionToken = session();
    const issued = await service.issue({
      sessionToken,
      phone: "+82 10-1234-5678",
      ipKey: sessionToken
    });
    assert.match(issued.body, /^SPHMRS [A-Za-z0-9_-]{43}$/);
    assert.equal(issued.mode, "trial");
    assert.equal(Date.parse(issued.expiresAt) - now.getTime(), 300_000);
    await assert.rejects(
      service.status({ sessionToken: session(), id: issued.id }),
      { code: "NOT_FOUND" }
    );
    const token = issued.body.split(" ")[1];
    const match = {
      mailboxId: config.mailboxId,
      messageId: session(),
      phone: "01012345678",
      token,
      receivedAt: now,
      approved: false,
      policyVersion: "unvalidated"
    };
    assert.deepEqual(
      await service.match({
        ...match,
        phone: "01099999999",
        messageId: session()
      }),
      { outcome: "ignored" }
    );
    assert.deepEqual(await service.match(match), {
      outcome: "matched",
      state: "review"
    });
    assert.deepEqual(await service.match(match), { outcome: "duplicate" });
    const restarted = new PhoneVerificationService(
      new PgPhoneVerificationRepository(pool!),
      { ...config, now: () => now }
    );
    assert.equal(
      (await restarted.status({ sessionToken, id: issued.id })).state,
      "review"
    );
    assert.equal(
      (await restarted.status({ sessionToken, id: issued.id })).proofToken,
      undefined
    );
    await service.cancel({ sessionToken, id: issued.id });
    assert.equal(
      (await service.status({ sessionToken, id: issued.id })).state,
      "cancelled"
    );
    assert.deepEqual(
      await service.match({ ...match, messageId: session(), approved: true }),
      { outcome: "ignored" }
    );
    now = new Date(now.getTime() + 301_000);
    const freshSession = session();
    const fresh = await service.issue({
      sessionToken: freshSession,
      phone: "01055556666",
      ipKey: session()
    });
    now = new Date(now.getTime() + 300_000);
    assert.equal(
      (await service.status({ sessionToken: freshSession, id: fresh.id }))
        .state,
      "expired"
    );
    assert.deepEqual(
      await service.match({
        ...match,
        token: fresh.body.split(" ")[1],
        phone: "01055556666",
        messageId: session(),
        receivedAt: now
      }),
      { outcome: "ignored" }
    );
    const rows = await pool!.query(
      "SELECT row_to_json(c)::text AS data FROM phone_verification.challenges c WHERE id=$1",
      [issued.id]
    );
    assert.doesNotMatch(
      rows.rows[0].data,
      /01012345678|1234-5678|SPHMRS|verify@example/
    );
    assert.equal(rows.rows[0].data.includes(token), false);
    assert.equal(rows.rows[0].data.includes(sessionToken), false);
  }
);

test(
  "PostgreSQL: concurrent issue limits and replacement are durable",
  { skip: !repo },
  async () => {
    const sessionToken = session();
    const service = new PhoneVerificationService(repo!, {
      ...config,
      limits: { session: 2, phone: 2, ip: 2, windowMs: 3_600_000 }
    });
    const inputs = {
      sessionToken,
      phone: `010${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`,
      ipKey: sessionToken
    };
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () => service.issue(inputs))
    );
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    assert.equal(fulfilled.length, 2);
    for (const result of results)
      if (result.status === "rejected")
        assert.equal(result.reason.code, "RATE_LIMITED");
    const states = await Promise.all(
      fulfilled.map((r) => service.status({ sessionToken, id: r.value.id }))
    );
    assert.equal(states.filter((s) => s.state === "pending").length, 1);
    assert.equal(states.filter((s) => s.state === "cancelled").length, 1);
    await assert.rejects(
      new PhoneVerificationService(new PgPhoneVerificationRepository(pool!), {
        ...config,
        limits: { session: 2, phone: 2, ip: 2, windowMs: 3_600_000 }
      }).issue(inputs),
      { code: "RATE_LIMITED" }
    );
  }
);

test(
  "PostgreSQL: atomic proof consume rejects wrong ownership and all replays",
  { skip: !repo },
  async () => {
    const service = new PhoneVerificationService(repo!, config);
    const sessionToken = session();
    const phone = "01022223333";
    const challenge = await service.issue({
      sessionToken,
      phone,
      ipKey: sessionToken
    });
    assert.deepEqual(
      await service.match({
        mailboxId: config.mailboxId,
        messageId: session(),
        phone,
        token: challenge.body.split(" ")[1],
        receivedAt: new Date(),
        approved: true,
        policyVersion: "injected-test-only"
      }),
      { outcome: "matched", state: "verified" }
    );
    const proofToken = (
      await service.status({ sessionToken, id: challenge.id })
    ).proofToken!;
    assert.ok(proofToken);
    await assert.rejects(
      service.consumeProof({ sessionToken: session(), phone, proofToken }),
      { code: "INVALID_PROOF" }
    );
    await assert.rejects(
      service.consumeProof({ sessionToken, phone: "01099998888", proofToken }),
      { code: "INVALID_PROOF" }
    );
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        service.consumeProof({ sessionToken, phone, proofToken })
      )
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      (await service.status({ sessionToken, id: challenge.id })).state,
      "consumed"
    );
  }
);

test(
  "PostgreSQL: lease-fenced match cannot grant from expired or superseded workers",
  { skip: !repo },
  async () => {
    let now = new Date("2031-01-01T00:00:00Z");
    const service = new PhoneVerificationService(repo!, {
      ...config,
      now: () => now
    });
    const sessionToken = session();
    const phone = "01066667777";
    const challenge = await service.issue({
      sessionToken,
      phone,
      ipKey: sessionToken
    });
    const ref = {
      mailboxId: config.mailboxId,
      messageId: session(),
      receivedAt: now
    };
    await repo!.enqueueDelivery(ref, now);
    const lease = await repo!.claimDelivery(now, 1000);
    assert.ok(lease);
    const candidate = {
      ...ref,
      phone,
      token: challenge.body.split(" ")[1],
      approved: true,
      policyVersion: "injected-test-only",
      deliveryLease: lease
    };
    now = new Date(now.getTime() + 1001);
    assert.deepEqual(await service.match(candidate), { outcome: "ignored" });
    assert.equal(
      (await service.status({ sessionToken, id: challenge.id })).state,
      "pending"
    );
    const next = await repo!.claimDelivery(now, 1000);
    assert.ok(next);
    assert.deepEqual(await service.match(candidate), { outcome: "ignored" });
    assert.deepEqual(
      await service.match({ ...candidate, deliveryLease: next }),
      { outcome: "matched", state: "verified" }
    );
    assert.equal(await repo!.completeDelivery(next, now), true);
  }
);

test(
  "PostgreSQL: pre-issue/future messages and expired proofs fail closed",
  { skip: !repo },
  async () => {
    let now = new Date("2032-01-01T00:00:00Z");
    const service = new PhoneVerificationService(repo!, {
      ...config,
      now: () => now
    });
    const sessionToken = session();
    const phone = "01088889999";
    const issued = await service.issue({
      sessionToken,
      phone,
      ipKey: sessionToken
    });
    const candidate = {
      mailboxId: config.mailboxId,
      messageId: session(),
      phone,
      token: issued.body.split(" ")[1],
      receivedAt: new Date(now.getTime() - 1),
      approved: true,
      policyVersion: "test"
    };
    assert.deepEqual(await service.match(candidate), { outcome: "ignored" });
    assert.deepEqual(
      await service.match({
        ...candidate,
        messageId: session(),
        receivedAt: new Date(now.getTime() + 1)
      }),
      { outcome: "ignored" }
    );
    assert.deepEqual(
      await service.match({
        ...candidate,
        messageId: session(),
        receivedAt: now
      }),
      { outcome: "matched", state: "verified" }
    );
    const proofToken = (await service.status({ sessionToken, id: issued.id }))
      .proofToken!;
    now = new Date(now.getTime() + 300_000);
    await assert.rejects(
      service.consumeProof({ sessionToken, phone, proofToken }),
      { code: "INVALID_PROOF" }
    );
    await assert.rejects(
      service.cancel({ sessionToken: session(), id: issued.id }),
      { code: "NOT_FOUND" }
    );
    await service.cancel({ sessionToken, id: issued.id });
    assert.equal(
      (await service.status({ sessionToken, id: issued.id })).state,
      "expired"
    );
  }
);

test(
  "PostgreSQL: phone and IP caps span independent sessions and reset at window boundary",
  { skip: !repo },
  async () => {
    let now = new Date("2033-01-01T00:00:00Z");
    const service = new PhoneVerificationService(repo!, {
      ...config,
      now: () => now,
      limits: { session: 10, phone: 1, ip: 1, windowMs: 1000 }
    });
    const phone = "01033334444";
    const ipKey = session();
    await service.issue({ sessionToken: session(), phone, ipKey });
    await assert.rejects(
      service.issue({ sessionToken: session(), phone, ipKey: session() }),
      { code: "RATE_LIMITED" }
    );
    await assert.rejects(
      service.issue({ sessionToken: session(), phone: "01044445555", ipKey }),
      { code: "RATE_LIMITED" }
    );
    now = new Date(now.getTime() + 1000);
    assert.equal(
      (await service.issue({ sessionToken: session(), phone, ipKey })).mode,
      "trial"
    );
  }
);

test(
  "PostgreSQL: fifth failed lease is terminal and retention cleanup is bounded with 10k rows",
  { skip: !repo },
  async () => {
    let now = new Date("2034-01-01T00:00:00Z");
    const ref = { mailboxId: config.mailboxId, messageId: session() };
    await repo!.enqueueDelivery(ref, now);
    for (let attempt = 1; attempt <= 5; attempt++) {
      const lease = await repo!.claimDelivery(now);
      assert.ok(lease);
      assert.equal(lease.attempts, attempt);
      assert.equal(await repo!.failDelivery(lease, now), true);
      now = new Date(now.getTime() + 600_000);
    }
    assert.equal(await repo!.claimDelivery(now), null);
    const prefix = session();
    await pool!.query(
      "INSERT INTO phone_verification.rate_limits (key_hash,window_started_at,attempts,expires_at) SELECT $1 || n::text,$2,1,$2 FROM generate_series(1,10000) n",
      [prefix, new Date("2020-01-01")]
    );
    await repo!.cleanup(now);
    const remaining = Number(
      (
        await pool!.query(
          "SELECT count(*) FROM phone_verification.rate_limits WHERE key_hash LIKE $1",
          [`${prefix}%`]
        )
      ).rows[0].count
    );
    assert.ok(remaining >= 9000 && remaining < 10000);
    await pool!.query(
      "DELETE FROM phone_verification.rate_limits WHERE key_hash LIKE $1",
      [`${prefix}%`]
    );
    await assert.rejects(
      repo!.enqueueDelivery({ ...ref, messageId: "bad\nreference" }),
      { code: "INVALID_INPUT" }
    );
    await assert.rejects(
      repo!.enqueueDelivery({ ...ref, receivedAt: new Date("bad") }),
      { code: "INVALID_INPUT" }
    );
    await assert.rejects(repo!.claimDelivery(now, -1), {
      code: "INVALID_INPUT"
    });
  }
);

test(
  "PostgreSQL: durable delivery dedupe, fenced leases, bounded retries and cleanup",
  { skip: !repo },
  async () => {
    let now = new Date("2030-01-01T00:00:00Z");
    const ref = { mailboxId: "test-mailbox", messageId: session() };
    assert.equal(await repo!.enqueueDelivery(ref, now), true);
    assert.equal(
      await new PgPhoneVerificationRepository(pool!).enqueueDelivery(ref, now),
      false
    );
    const lease = await repo!.claimDelivery(now, 1000);
    assert.ok(lease);
    assert.equal(await repo!.claimDelivery(now, 1000), null);
    now = new Date(now.getTime() + 1001);
    const next = await repo!.claimDelivery(now, 1000);
    assert.equal(next?.id, lease.id);
    assert.notEqual(next?.leaseToken, lease.leaseToken);
    assert.equal(await repo!.completeDelivery(lease, now), false);
    assert.equal(await repo!.failDelivery(next!, now), true);
    assert.equal(await repo!.claimDelivery(now), null);
    now = new Date(now.getTime() + 3_600_000);
    const retried = await repo!.claimDelivery(now);
    assert.ok(retried);
    assert.equal(await repo!.completeDelivery(retried, now), true);
    await repo!.cleanup(new Date(now.getTime() + 25 * 3_600_000));
    assert.equal(
      (
        await pool!.query(
          "SELECT count(*) FROM phone_verification.deliveries WHERE id=$1",
          [lease.id]
        )
      ).rows[0].count,
      "0"
    );
  }
);
