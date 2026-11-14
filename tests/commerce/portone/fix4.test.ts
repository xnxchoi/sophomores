import assert from 'node:assert/strict'
import test from 'node:test'
import { admissionFixture } from './admission-fixture'
import { admitReconciliation, endReconciliation, retainReconciliationRisk } from '../../../src/lib/commerce/portone/accounting'

test('global lock busy completion leaves a durable known marker recoverable after lease expiry', async () => {
  const f = await admissionFixture()
  await admitReconciliation(f.req, f.identity, 'resume')
  f.setLocksAvailable(key => !key.endsWith('reconciliation-provider-global'))
  assert.equal(await endReconciliation(f.req, 'completed'), 'completed')
  const markers = [...f.rows.values()].filter(row => row.scope.startsWith('reconciliation-completion:'))
  assert.equal(markers.length, 1)
  f.advance(100000)
  f.setLocksAvailable(true)
  assert.equal((await admitReconciliation(f.other(), f.identity, 'resume')).decision, 'started')
  assert.notEqual(f.attempt().escalation, 'ownership')
})

test('completion retries a transient lock busy in production and clears the owner', async () => {
  const f = await admissionFixture()
  await admitReconciliation(f.req, f.identity, 'resume')
  let failures = 2
  f.setLocksAvailable(() => failures-- <= 0)
  assert.equal(await endReconciliation(f.req, 'completed'), 'completed')
  assert.equal(f.attempt().active, undefined)
})

test('a known completion marker also recovers an expiry observed before catch-up', async () => {
  const f = await admissionFixture()
  await admitReconciliation(f.req, f.identity, 'resume')
  f.setLocksAvailable(key => !key.endsWith('reconciliation-provider-global'))
  await endReconciliation(f.req, 'completed')
  f.advance(100000)
  f.seed({ active: { ...f.attempt().active!, state: 'unknown' }, escalation: 'ownership' })
  f.setLocksAvailable(true)
  assert.equal((await admitReconciliation(f.other(), f.identity, 'resume')).decision, 'started')
  assert.equal(f.attempt().escalation, undefined)
})

test('an actually unknown completion marker never releases ownership', async () => {
  const f = await admissionFixture()
  await admitReconciliation(f.req, f.identity, 'resume')
  f.setLocksAvailable(key => !key.endsWith('reconciliation-provider-global'))
  assert.equal(await endReconciliation(f.req, 'unknown'), 'unknown')
  f.setLocksAvailable(true)
  assert.equal((await admitReconciliation(f.other(), f.identity, 'resume')).decision, 'ownership-unknown')
  f.advance(100000)
  assert.equal((await admitReconciliation(f.other(), f.identity, 'resume')).decision, 'ownership-unknown')
})

test('risk journal busy preserves proof durably and completion recovers it without unknown', async () => {
  const f = await admissionFixture()
  await admitReconciliation(f.req, f.identity, 'resume')
  const proof = { id: f.identity.paymentID, storeId: 'store-reviewed', status: 'PAID', channel: { type: 'TEST', key: 'channel-reviewed' },
    customer: { id: f.identity.customerID }, currency: 'KRW', amount: { total: 100, paid: 100, cancelled: 0 }, disputes: [] }
  f.setLocksAvailable(false)
  await retainReconciliationRisk(f.req, proof)
  assert.equal([...f.rows.values()].some(row => row.scope.startsWith('reconciliation-risk:')), true)
  f.setLocksAvailable(true)
  assert.equal(await endReconciliation(f.req, 'review'), 'review')
  assert.equal(f.attempt().riskProofs.length, 1)
  assert.equal(f.attempt().active, undefined)
})

for (const failure of ['identity', 'ambiguous', 'parse'] as const) {
  test(`${failure} ledger integrity failure stops for review and is never busy`, async () => {
    const f = await admissionFixture()
    f.seed(failure === 'identity' ? { identity: { ...f.identity, snapshotHash: 'b'.repeat(64) } }
      : failure === 'parse' ? { ordinaryUsed: -1 } : {})
    if (failure === 'ambiguous') {
      const row = [...f.rows.values()][0]
      f.rows.set('duplicate', { ...row, id: 'duplicate' })
    }
    assert.equal((await admitReconciliation(f.req, f.identity, 'resume')).decision, 'review-required')
    assert.equal(f.attempt().active, undefined)
  })
}
