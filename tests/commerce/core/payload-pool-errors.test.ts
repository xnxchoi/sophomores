import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { Payload } from "payload";
import { inPaymentTransaction } from "../../../src/lib/commerce/_shared/transaction";
import { nativeTransactionFixture } from "./native-transaction-fixture";
import { payloadOnInit } from "./payload-on-init-fixture";
import { capturePayloadTestLifecycle } from "../../support/payload-lifecycle";

test("Payload onInit handles pool, existing and newly borrowed client errors once without logging evidence", async () => {
  const existing = new EventEmitter();
  const pool = Object.assign(new EventEmitter(), { _clients: [existing] });
  const messages: unknown[][] = [];
  await payloadOnInit({ error: (...args: unknown[]) => { messages.push(args); } })({ db: { pool } } as unknown as Payload);
  const client = new EventEmitter();
  pool.emit("connect", client);
  pool.emit("connect", client);
  for (const emitter of [existing, client, pool]) {
    const before = messages.length;
    assert.equal(emitter.emit("error", new Error("private driver evidence")), true);
    assert.equal(messages.length, before + 1);
    assert.deepEqual(messages.at(-1), ["Payload storage is unavailable."]);
  }
});

for (const clients of [undefined, null, {}, "not-an-array"]) {
  test(`Payload onInit tolerates unavailable client enumeration (${String(clients)})`, async () => {
    const pool = Object.assign(new EventEmitter(), clients === undefined ? {} : { _clients: clients });
    await payloadOnInit({ error: () => {} })({ db: { pool } } as unknown as Payload);
    const client = new EventEmitter();
    pool.emit("connect", client);
    assert.equal(client.listenerCount("error"), 1);
    assert.equal(client.emit("error", new Error("handled")), true);
  });
}

test("Payload onInit skips non-clients and deduplicates an enumerated connect client", async () => {
  const client = new EventEmitter();
  const pool = Object.assign(new EventEmitter(), { _clients: [null, {}, { on: true }, client] });
  await payloadOnInit({ error: () => {} })({ db: { pool } } as unknown as Payload);
  pool.emit("connect", client);
  assert.equal(client.listenerCount("error"), 1);
});

test("handled borrowed-client error does not swallow an in-flight native query rejection", async (t) => {
  const client = new EventEmitter();
  const pool = Object.assign(new EventEmitter(), { _clients: [client] });
  let logged = 0;
  await payloadOnInit({ error: () => { logged++; } })({ db: { pool } } as unknown as Payload);
  const queryError = new Error("private rejected query");
  let entered!: () => void;
  let rejectQuery!: (error: Error) => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const query = new Promise<void>((_resolve, reject) => { rejectQuery = reject; });
  const f = await nativeTransactionFixture({ onQuery: (kind) => {
    if (kind === "commit") { entered(); return query; }
  } });
  t.after(f.cleanup);
  const rejected = assert.rejects(inPaymentTransaction(f.req, async () => { await f.capture(); return "not-success"; }),
    (error: Error) => /outcome unknown/.test(error.message)
      && error.cause instanceof Error && error.cause.cause === queryError);
  await started;
  client.emit("error", queryError);
  rejectQuery(queryError);
  await rejected;
  assert.equal(logged, 1);
  assert.deepEqual(f.events, ["begin", "commit", "rollback"]);
});

test("Payload fixture teardown joins a still-running subtest continuation before ending the pool", async () => {
  const events: string[] = [];
  let finish!: () => void;
  const continuation = new Promise<void>((resolve) => { finish = resolve; }).then(() => { events.push("count-complete"); });
  const pool = { _clients: [{ release: () => { events.push("release"); } }], end: async () => { events.push("end"); } };
  const payload = { db: { pool, sessions: {} }, destroy: async () => { events.push("destroy"); } } as unknown as Payload;
  const close = capturePayloadTestLifecycle(payload, new Set([continuation]));
  const closed = close();
  await new Promise<void>((resolve) => { setImmediate(resolve); });
  const endedEarly = events.includes("end");
  finish();
  await closed;
  assert.equal(endedEarly, false);
  assert.deepEqual(events, ["count-complete", "destroy", "release", "end"]);
});

test("Payload fixture teardown reports rejected continuations after cleaning up", async () => {
  const events: string[] = [];
  const failure = new Error("continuation failed");
  const continuation = Promise.reject(failure);
  const pool = { _clients: [{ release: () => { events.push("release"); } }], end: async () => { events.push("end"); } };
  const payload = { db: { pool, sessions: {} }, destroy: async () => { events.push("destroy"); } } as unknown as Payload;
  await assert.rejects(capturePayloadTestLifecycle(payload, new Set([continuation]))(), (error: AggregateError) => {
    assert.deepEqual(events, ["destroy", "release", "end"]);
    assert.deepEqual(error.errors, [failure]);
    return true;
  });
});

test("Payload fixture teardown bounds its join and still cleans up after timeout", { timeout: 500 }, async () => {
  const events: string[] = [];
  const pool = { _clients: [{ release: () => { events.push("release"); } }], end: async () => { events.push("end"); } };
  const payload = { db: { pool, sessions: {} }, destroy: async () => { events.push("destroy"); } } as unknown as Payload;
  const never = new Promise<void>(() => {});
  await assert.rejects(capturePayloadTestLifecycle(payload, new Set([never]), 20)(), (error: AggregateError) => {
    assert.deepEqual(events, ["destroy", "release", "end"]);
    assert.match(error.errors[0].message, /continuation join timed out after 20 ms/);
    return true;
  });
});

test("Payload fixture teardown preserves continuation and cleanup failures together", async () => {
  const failures = [new Error("continuation"), new Error("rollback"), new Error("destroy"), new Error("release"), new Error("end")];
  const pool = { _clients: [{ release: () => { throw failures[3]; } }], end: async () => { throw failures[4]; } };
  const payload = { db: { pool, sessions: { owned: {} }, rollbackTransaction: async () => { throw failures[1]; } },
    destroy: async () => { throw failures[2]; } } as unknown as Payload;
  await assert.rejects(capturePayloadTestLifecycle(payload, new Set([Promise.reject(failures[0])]))(),
    (error: AggregateError) => { assert.deepEqual(error.errors, failures); return true; });
});

test("Payload fixture teardown retains observed rejections even when another continuation times out", { timeout: 500 }, async () => {
  const failure = new Error("observed rejection");
  const pool = { _clients: [{ release: () => {} }], end: async () => {} };
  const payload = { db: { pool, sessions: {} }, destroy: async () => {} } as unknown as Payload;
  const continuations = new Set([Promise.reject(failure), new Promise<void>(() => {})]);
  await assert.rejects(capturePayloadTestLifecycle(payload, continuations, 20)(), (error: AggregateError) => {
    assert.equal(error.errors[0], failure);
    assert.match(error.errors[1].message, /continuation join timed out/);
    return true;
  });
});
