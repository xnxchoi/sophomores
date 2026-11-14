import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { nativeTransactionFixture } from '../core/native-transaction-fixture'
import { getReconciliationPool, inLedgerTransaction, KnownLedgerRejection } from '../../../src/lib/commerce/portone/ledger-transaction'

async function fixture() {
  const f = await nativeTransactionFixture()
  class Pool extends EventEmitter {
    async connect() { throw new Error('Synthetic acquisition failure') }
  }
  f.adapter.pg = { ...f.adapter.pg, Pool: Pool as unknown as typeof f.adapter.pg.Pool }
  f.adapter.pool = {} as typeof f.adapter.pool
  return f
}

test('pre-BEGIN connection/acquire failure is known and never enters ledger work', async () => {
  const f = await fixture()
  let entered = false
  await assert.rejects(inLedgerTransaction(f.req, async () => { entered = true }), error => error instanceof KnownLedgerRejection && error.busy)
  assert.equal(entered, false)
  assert.deepEqual(f.events, [])
})

test('a deterministic BEGIN failure is known but not busy', async () => {
  const f = await nativeTransactionFixture()
  class Pool extends EventEmitter {
    async connect() { return { query: async () => { throw new Error('Invalid transaction configuration') }, release: () => {} } }
  }
  f.adapter.pg = { ...f.adapter.pg, Pool: Pool as unknown as typeof f.adapter.pg.Pool }
  f.adapter.pool = {} as typeof f.adapter.pool
  await assert.rejects(inLedgerTransaction(f.req, async () => {}), error => error instanceof KnownLedgerRejection && !error.busy)
})

test('dedicated pool and every connected client handle idle errors without leaking details', async () => {
  const f = await fixture()
  const reports: unknown[] = []
  f.req.payload.logger.error = ((data: unknown) => { reports.push(data) }) as typeof f.req.payload.logger.error
  const pool = getReconciliationPool(f.req.payload)
  const client = new EventEmitter()
  assert.equal(pool.listenerCount('error'), 1)
  pool.emit('connect', client)
  pool.emit('connect', client)
  assert.equal(client.listenerCount('error'), 1)
  assert.doesNotThrow(() => { pool.emit('error', new Error('private driver detail')); client.emit('error', new Error('private driver detail')) })
  assert.equal(reports.length, 2)
  assert.equal(JSON.stringify(reports).includes('private driver detail'), false)
})
