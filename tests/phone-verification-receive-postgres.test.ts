import assert from "node:assert/strict";
import { randomBytes, randomInt } from "node:crypto";
import { after, before, test } from "node:test";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import { PgPhoneVerificationRepository } from "../lib/phone-verification/server/postgres";
import { PhoneVerificationService } from "../lib/phone-verification/server/service";
import { pollZohoOnce } from "../lib/phone-verification/server/poller";
import { processNextZohoDelivery } from "../lib/phone-verification/server/worker";
import { createLocalVerificationRuntime } from "../lib/phone-verification/server/runtime";

const url = process.env.PHONE_VERIFICATION_TEST_DATABASE_URL;
if (url) {
  const candidate = new URL(url);
  if (
    !["postgres:", "postgresql:"].includes(candidate.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(candidate.hostname) ||
    !/^\/sophomores_verification_(?:local|test(?:_[a-z0-9_]+)?)$/.test(
      candidate.pathname
    ) ||
    candidate.search ||
    candidate.hash
  )
    throw Error("Requires isolated local verification test database");
}
const pool = url ? new Pool({ connectionString: url, max: 6 }) : null;
const repo = pool ? new PgPhoneVerificationRepository(pool) : null;
const id = () =>
  `${Date.now()}${randomInt(1000000).toString().padStart(6, "0")}`;
const mailboxId = id();
const foreignMailboxId = id();
const ownedChallenges: string[] = [];
before(async () => {
  if (repo) await repo.migrate();
});
after(async () => {
  if (pool) {
    await pool.query(
      "DELETE FROM phone_verification.deliveries WHERE mailbox_id=ANY($1::text[])",
      [[mailboxId, foreignMailboxId]]
    );
    await pool.query(
      "DELETE FROM phone_verification.challenges WHERE id=ANY($1::uuid[])",
      [ownedChallenges]
    );
    await pool.end();
  }
});

test(
  "PostgreSQL scoped polling skips earlier stale/foreign queue rows and processes only current scan once",
  { skip: !repo },
  async () => {
    const now = new Date();
    const sessionToken = randomBytes(32).toString("base64url");
    const service = new PhoneVerificationService(repo!, {
      secret: randomBytes(32).toString("hex"),
      recipient: "verify@sophomores.co",
      mailboxId
    });
    const challenge = await service.issue({
      sessionToken,
      phone: "01012345678",
      ipKey: sessionToken
    });
    ownedChallenges.push(challenge.id);
    const currentId = id();
    const stale = [
      { mailboxId, messageId: id() },
      { mailboxId: foreignMailboxId, messageId: currentId },
      { mailboxId, messageId: id() }
    ];
    for (const ref of stale)
      await repo!.enqueueDelivery(ref, new Date(now.getTime() - 60_000));
    await pool!.query(
      "UPDATE phone_verification.deliveries SET attempts=5 WHERE mailbox_id=$1 AND message_id=$2",
      [mailboxId, stale[2].messageId]
    );
    const reference = {
      mailboxId,
      messageId: currentId,
      receivedAt: new Date()
    };
    let rawReads = 0;
    const run = () =>
      pollZohoOnce({
        repository: repo!,
        searchPage: async () => ({ deliveries: [reference], pageFull: false }),
        processNext: async (allowed) =>
          processNextZohoDelivery({
            mailboxId,
            recipient: "verify@sophomores.co",
            service,
            repository: {
              claimDelivery: () =>
                repo!.claimDelivery(undefined, undefined, {
                  mailboxId,
                  messageIds: [...allowed]
                }),
              completeDelivery: (fence, at) =>
                repo!.completeDelivery(fence, at),
              failDelivery: (fence, at) => repo!.failDelivery(fence, at)
            },
            fetchOriginal: async (messageId) => {
              assert.equal(messageId, currentId);
              rawReads++;
              return `From: <01012345678@emms.nate.com>\r\nTo: <verify@sophomores.co>\r\nMessage-ID: <synthetic-current-scan@fixture.invalid>\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${challenge.body}`;
            }
          })
      });
    assert.deepEqual(await run(), {
      scannedPages: 1,
      enqueued: 1,
      completed: 1
    });
    assert.deepEqual(await run(), {
      scannedPages: 1,
      enqueued: 0,
      completed: 0
    });
    assert.equal(rawReads, 1);
    const status = await service.status({ sessionToken, id: challenge.id });
    assert.equal(status.state, "review");
    assert.equal(status.proofToken, undefined);
    await assert.rejects(
      service.status({
        sessionToken: randomBytes(32).toString("base64url"),
        id: challenge.id
      }),
      { code: "NOT_FOUND" }
    );
    const rows = await pool!.query(
      "SELECT mailbox_id,message_id,state,attempts FROM phone_verification.deliveries WHERE (mailbox_id=$1 AND message_id=ANY($2::text[])) OR (mailbox_id=$3 AND message_id=$4)",
      [
        mailboxId,
        [stale[0].messageId, stale[2].messageId],
        foreignMailboxId,
        currentId
      ]
    );
    assert.equal(rows.rowCount, 3);
    for (const row of rows.rows) {
      assert.equal(row.state, "queued");
      assert.equal(row.attempts, row.message_id === stale[2].messageId ? 5 : 0);
    }
  }
);

test(
  "PostgreSQL scoped claims validate bounded lossless numeric IDs and do not lease for empty or unknown scans",
  { skip: !repo },
  async () => {
    const scope = { mailboxId, messageIds: [] as string[] };
    assert.equal(await repo!.claimDelivery(undefined, undefined, scope), null);
    assert.equal(
      await repo!.claimDelivery(undefined, undefined, {
        ...scope,
        messageIds: [id()]
      }),
      null
    );
    assert.equal(
      await repo!.claimDelivery(undefined, undefined, {
        mailboxId,
        messageIds: Array.from(
          { length: 60 },
          (_, i) => `${"9".repeat(28)}${i.toString().padStart(2, "0")}`
        )
      }),
      null
    );
    for (const invalid of [
      { mailboxId: "wrong-mailbox", messageIds: [id()] },
      { mailboxId, messageIds: ["1e20"] },
      { mailboxId, messageIds: ["0001"] },
      { mailboxId, messageIds: [1 as unknown as string] },
      { mailboxId, messageIds: ["9".repeat(31)] },
      { mailboxId, messageIds: Array.from({ length: 61 }, id) }
    ])
      await assert.rejects(repo!.claimDelivery(undefined, undefined, invalid), {
        code: "INVALID_INPUT"
      });
    const messageId = id();
    await repo!.enqueueDelivery({ mailboxId, messageId });
    const lease = await repo!.claimDelivery(undefined, undefined, {
      mailboxId,
      messageIds: [messageId, messageId]
    });
    assert.equal(lease?.messageId, messageId);
    assert.equal(await repo!.completeDelivery(lease!), true);
  }
);

test(
  "local runtime bounds held delivery row locks without leasing foreign rows",
  { skip: !repo },
  async () => {
    const runtime = createLocalVerificationRuntime({
      transport: "fixture",
      origin: "http://127.0.0.1:3000",
      databaseUrl: url!,
      secret: randomBytes(32).toString("hex"),
      webhookSecret: "unused-local-fixture-secret-longer-than32bytes",
      recipient: "verify@sophomores.co",
      mailboxId,
      zohoUserId: "1",
      zohoIntegrationId: "1"
    });
    const messageId = id();
    await repo!.enqueueDelivery({ mailboxId, messageId });
    const lease = await repo!.claimDelivery(undefined, undefined, {
      mailboxId,
      messageIds: [messageId]
    });
    assert.ok(lease);
    const blocker = await pool!.connect();
    await blocker.query("BEGIN");
    await blocker.query(
      "SELECT id FROM phone_verification.deliveries WHERE id=$1 FOR UPDATE",
      [lease.id]
    );
    const start = performance.now();
    try {
      await assert.rejects(
        runtime.repository.completeDelivery(lease),
        (error: unknown) => (error as { code?: string }).code === "55P03"
      );
      assert.ok(performance.now() - start < 4000);
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
      await runtime.pool.end();
    }
    assert.equal(await repo!.completeDelivery(lease), true);
  }
);
