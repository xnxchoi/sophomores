import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { acquireReceiverLock, ReceiverOwnershipError } from '@/lib/phone-verification/server/receiver-lock';

const scope = { origin: 'http://localhost:3240', recipient: 'verify@example.invalid', mailboxId: '123', secret: 'a'.repeat(64) };
function client(acquired = true) {
  const emitter = new EventEmitter();
  const calls: { sql: string; values: string[] }[] = [];
  const releases: boolean[] = [];
  return Object.assign(emitter, {
    calls, releases,
    query: async (sql: string, values: string[]) => { calls.push({ sql, values }); return { rows: [{ acquired }] }; },
    release: (destroy: boolean) => { releases.push(destroy); }
  });
}
test('a dedicated connection holds an opaque parameterized runtime lock and destroys it once', async () => {
  const c = client(); let lost = 0;
  const lock = await acquireReceiverLock(() => Promise.resolve(c), scope, () => { lost++; });
  assert.match(c.calls[0].sql, /pg_try_advisory_lock\(\$1::bigint\)/);
  assert.match(c.calls[0].values[0], /^-?[0-9]+$/);
  assert.doesNotMatch(JSON.stringify(c.calls), /verify@example|localhost:3240|aaaa/);
  c.emit('error', new Error('fixture-connection-secret')); assert.equal(lost, 1);
  lock.release(); lock.release();
  c.emit('end'); assert.equal(lost, 1);
  assert.deepEqual(c.releases, [true]);
});
test('duplicate ownership fails non-retryably before provider work and releases the candidate', async () => {
  const c = client(false);
  await assert.rejects(acquireReceiverLock(() => Promise.resolve(c), scope, () => {}), ReceiverOwnershipError);
  assert.deepEqual(c.releases, [true]);
});
test('query failures do not leak errors or leak a lock connection', async () => {
  const c = client();
  c.query = async () => { throw new Error('fixture-password'); };
  await assert.rejects(acquireReceiverLock(() => Promise.resolve(c), scope, () => {}), /Receiver lock unavailable/);
  assert.deepEqual(c.releases, [true]);
});
test('different exact recipients produce different scope keys', async () => {
  const first = client(), second = client();
  const a = await acquireReceiverLock(() => Promise.resolve(first), scope, () => {});
  const b = await acquireReceiverLock(() => Promise.resolve(second), { ...scope, recipient: 'other@example.invalid' }, () => {});
  assert.notEqual(first.calls[0].values[0], second.calls[0].values[0]);
  a.release(); b.release();
});
