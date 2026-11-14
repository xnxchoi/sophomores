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
      const filter = condition as { equals?: unknown; in?: unknown[]; exists?: boolean };
      if (filter.exists !== undefined) return (doc[field] != null) === filter.exists;
      return filter.in ? filter.in.includes(doc[field]) : doc[field] === filter.equals;
    });
  const payload = {
    db: { name: "postgres", sessions,
      beginTransaction: async () => { const id = `tx-${++sequence}`; sessions[id] = { db: { execute: async () => undefined } }; return id; },
      commitTransaction: async (id: string) => { delete sessions[id]; },
      rollbackTransaction: async (id: string) => { delete sessions[id]; } },
    find: async ({ collection, where, limit }: { collection: string; where: Record<string, unknown>; limit: number }) => {
      const docs = rows[collection].filter((doc) => matches(doc, where)).slice(0, limit);
      return { docs: structuredClone(docs), totalDocs: docs.length };
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
