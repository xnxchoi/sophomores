import assert from "node:assert/strict";
import { test } from "node:test";
import type { Payload } from "payload";
import type { KeyGrantAdapter } from "@/lib/commerce/keys/contracts";
import { dispatchKeyGrants, reconcileKeyGrants } from "@/lib/commerce/keys/worker";

type Row = Record<string, unknown> & { id: string };
const target = { chainID: 84532, lock: `0x${"a".repeat(40)}`, recipient: `0x${"b".repeat(40)}` };
const hash = `0x${"c".repeat(64)}`;

/** Provider-free payload model for the worker; not PostgreSQL evidence. */
function fakePayload(intents: Row[], admissions: Row[] = [{ id: "adm", status: "available" }]) {
  const rows: Record<string, Row[]> = { "commerce-key-grant-intents": intents, "commerce-admissions": admissions };
  const sessions: Record<string, { db: { execute: () => Promise<void> } }> = {};
  let sequence = 0;
  const matches = (doc: Row, where: Record<string, unknown>): boolean => Array.isArray(where.and)
    ? where.and.every((part) => matches(doc, part as Record<string, unknown>))
    : Object.entries(where).every(([field, condition]) => {
      if (field === "or") return (condition as Record<string, unknown>[]).some((part) => matches(doc, part));
      const filter = condition as { equals?: unknown; in?: unknown[]; exists?: boolean; less_than_equal?: string };
      if (filter.exists !== undefined) return (doc[field] != null) === filter.exists;
      if (filter.less_than_equal !== undefined) return doc[field] != null && String(doc[field]) <= filter.less_than_equal;
      return filter.in ? filter.in.includes(doc[field]) : doc[field] === filter.equals;
    });
  const payload = {
    db: { name: "postgres", sessions,
      beginTransaction: async () => { const id = `tx-${++sequence}`; sessions[id] = { db: { execute: async () => undefined } }; return id; },
      commitTransaction: async (id: string) => { delete sessions[id]; },
      rollbackTransaction: async (id: string) => { delete sessions[id]; } },
    find: async ({ collection, where, limit, page = 1 }: { collection: string; where: Record<string, unknown>; limit: number; page?: number }) => {
      const all = rows[collection].filter((doc) => matches(doc, where));
      const docs = all.slice((page - 1) * limit, page * limit);
      return { docs: structuredClone(docs), totalDocs: all.length, hasNextPage: page * limit < all.length };
    },
    findByID: async ({ collection, id }: { collection: string; id: string }) => structuredClone(rows[collection].find((doc) => doc.id === id)!),
    update: async ({ collection, id, data }: { collection: string; id: string; data: Row }) => {
      const doc = rows[collection].find((entry) => entry.id === id)!;
      Object.assign(doc, data);
      return structuredClone(doc);
    },
  } as unknown as Payload;
  return { payload, rows };
}

const pending = (extra: Row | Record<string, unknown> = {}): Row => ({ id: "k", operationKey: "unlock-grant:v1:order:1", entitlement: "adm", state: "pending", attempts: 0, target, ...extra });
const adapter = (submit: KeyGrantAdapter["submit"], reconcile: KeyGrantAdapter["reconcile"] = async () => ({ kind: "unknown" })): KeyGrantAdapter => ({ submit, reconcile });

test("a confirmed submission grants the key with evidence", async () => {
  const { payload, rows } = fakePayload([pending()]);
  assert.equal(await dispatchKeyGrants({ payload, adapter: adapter(async () => ({ kind: "confirmed", txHash: hash, tokenID: "7" })) }), 1);
  const [intent] = rows["commerce-key-grant-intents"];
  assert.equal(intent.state, "granted");
  assert.equal(intent.tokenID, "7");
  assert.equal(intent.attempts, 1);
});

test("a throw or unknown outcome becomes ambiguous and is never dispatched again", async () => {
  for (const submit of [async () => { throw new Error("rpc down"); }, async () => ({ kind: "unknown" as const })]) {
    const { payload, rows } = fakePayload([pending()]);
    let calls = 0;
    const a = adapter(async (input) => { calls++; return submit(); });
    await dispatchKeyGrants({ payload, adapter: a });
    assert.equal(rows["commerce-key-grant-intents"][0].state, "ambiguous");
    await dispatchKeyGrants({ payload, adapter: a });
    assert.equal(calls, 1, "ambiguous work is not resubmitted");
  }
});

test("only proven non-execution is retryable; held admissions are not dispatched", async () => {
  const notSent = fakePayload([pending()]);
  await dispatchKeyGrants({ payload: notSent.payload, adapter: adapter(async () => ({ kind: "definitelyNotSent", code: "nonce_too_low" })) });
  assert.equal(notSent.rows["commerce-key-grant-intents"][0].state, "failed_retryable");
  assert.equal(notSent.rows["commerce-key-grant-intents"][0].lastErrorCode, "nonce_too_low");
  const held = fakePayload([pending()], [{ id: "adm", status: "available", benefitReview: true }]);
  let calls = 0;
  assert.equal(await dispatchKeyGrants({ payload: held.payload, adapter: adapter(async () => { calls++; return { kind: "confirmed", txHash: hash, tokenID: "1" }; }) }), 0);
  assert.equal(calls, 0);
  assert.equal(held.rows["commerce-key-grant-intents"][0].state, "pending");
});

test("reconciliation settles a submitted hash without resubmitting", async () => {
  const { payload, rows } = fakePayload([pending({ state: "submitted", txHash: hash, attemptID: "x" })]);
  let submits = 0;
  await reconcileKeyGrants({ payload, adapter: adapter(async () => { submits++; return { kind: "unknown" }; }, async () => ({ kind: "confirmed", tokenID: "9" })) });
  assert.equal(rows["commerce-key-grant-intents"][0].state, "granted");
  assert.equal(submits, 0);
});

test("held rows at the head of the queue cannot starve later eligible work", async () => {
  const held = Array.from({ length: 30 }, (_, index): Row => pending({ id: `held-${index}`, operationKey: `k${index}`, entitlement: "held" }));
  const { payload, rows } = fakePayload([...held, pending({ id: "ok", operationKey: "ok" })], [{ id: "held", status: "available", benefitReview: true }, { id: "adm", status: "available" }]);
  assert.equal(await dispatchKeyGrants({ payload, adapter: adapter(async () => ({ kind: "confirmed", txHash: hash, tokenID: "1" })) }), 1);
  assert.equal(rows["commerce-key-grant-intents"].find((row) => row.id === "ok")!.state, "granted");
});

test("a retry after a proven revert is a fresh attempt; the old attempt's result never lands on it", async () => {
  const old = `0x${"d".repeat(64)}`;
  const { payload, rows } = fakePayload([pending({ state: "failed_retryable", txHash: old, attemptID: "first", attempts: 1, nextAttemptAt: new Date(0).toISOString() })]);
  await dispatchKeyGrants({ payload, adapter: adapter(async () => ({ kind: "submitted", txHash: hash })) });
  const [intent] = rows["commerce-key-grant-intents"];
  assert.equal(intent.state, "submitted");
  assert.equal(intent.txHash, hash, "the new attempt records its own hash");
  assert.notEqual(intent.attemptID, "first");
  assert.equal(intent.attempts, 2);
});

test("more held rows than one pass can scan still never block later work", async () => {
  const held = Array.from({ length: 600 }, (_, index): Row => pending({ id: `held-${index}`, operationKey: `k${index}`, entitlement: "held" }));
  const { payload, rows } = fakePayload([...held, pending({ id: "ok", operationKey: "ok" })], [{ id: "held", status: "available", benefitReview: true }, { id: "adm", status: "available" }]);
  const a = adapter(async () => ({ kind: "confirmed", txHash: hash, tokenID: "1" }));
  await dispatchKeyGrants({ payload, adapter: a });
  await dispatchKeyGrants({ payload, adapter: a }); // the first pass deferred 500 held rows; the second reaches the rest
  assert.equal(rows["commerce-key-grant-intents"].find((row) => row.id === "ok")!.state, "granted");
  assert.ok(rows["commerce-key-grant-intents"].filter((row) => row.entitlement === "held").every((row) => row.state === "pending" && row.nextAttemptAt));
});

test("a failed retry is deferred, and an unanswered reconcile is pushed back instead of blocking", async () => {
  const notSent = fakePayload([pending()]);
  await dispatchKeyGrants({ payload: notSent.payload, adapter: adapter(async () => ({ kind: "definitelyNotSent", code: "x" })) });
  const [failed] = notSent.rows["commerce-key-grant-intents"];
  assert.equal(failed.state, "failed_retryable");
  assert.ok(String(failed.nextAttemptAt) > new Date().toISOString(), "retry waits for its backoff");
  const quiet = fakePayload([pending({ state: "ambiguous", txHash: hash, attemptID: "x" })]);
  await reconcileKeyGrants({ payload: quiet.payload, adapter: adapter(async () => ({ kind: "unknown" }), async () => ({ kind: "unknown" })) });
  assert.equal(quiet.rows["commerce-key-grant-intents"][0].state, "ambiguous");
  assert.ok(quiet.rows["commerce-key-grant-intents"][0].nextAttemptAt);
});
