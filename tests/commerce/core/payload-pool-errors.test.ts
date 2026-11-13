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
