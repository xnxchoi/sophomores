import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { admissionFixture } from './admission-fixture'
import { admitReconciliation, debitProviderGet, endReconciliation, assertReconciliationFence, accountedProviderGet } from '../../../src/lib/commerce/portone/accounting'
import { reconciliationPolicy } from '../../../src/lib/commerce/portone/policy'

test('server policy exposes the exact approved limits without browser overrides', () => {
  assert.deepEqual(reconciliationPolicy, { providerDeadlineMs: 10000, foregroundWaitMs: 30000,
    recheckDelaysMs: [2000, 5000, 15000, 60000, 300000, 1800000], ordinaryGets: 12, riskGets: 4,
    lifetimeMs: 86400000, globalGetsPerSecond: 5, escalationMs: 1800000 })
  assert.equal(Object.isFrozen(reconciliationPolicy), true)
})

test('one exact attempt joins; both GETs are reserved and durably debited before use', async () => {
  const f = await admissionFixture()
  assert.equal((await admitReconciliation(f.req, f.identity, 'confirm')).decision, 'started')
  assert.equal((await admitReconciliation(f.other(), f.identity, 'confirm')).decision, 'join')
  await debitProviderGet(f.req, f.identity.paymentID)
  await debitProviderGet(f.req, f.identity.paymentID)
  assert.equal(f.attempt().ordinaryUsed, 2)
  assert.equal(f.attempt().active?.remaining, 0)
  await endReconciliation(f.req, 'completed')
  assert.equal(f.attempt().active, undefined)
  assert.equal(f.attempt().last?.outcome, 'completed')
})

test('full-operation fit stops before the first GET and escalates without retiring', async () => {
  const f = await admissionFixture()
  f.seed({ ordinaryUsed: 11 })
  assert.equal((await admitReconciliation(f.req, f.identity, 'confirm')).decision, 'budget-stop')
  assert.equal(f.attempt().ordinaryUsed, 11)
  assert.equal(f.attempt().escalation, 'budget')
})

test('expiry and client timeout never steal ownership or refund debits', async () => {
  const f = await admissionFixture()
  await admitReconciliation(f.req, f.identity, 'confirm')
  await debitProviderGet(f.req, f.identity.paymentID)
  f.advance(90001)
  assert.equal((await admitReconciliation(f.other(), f.identity, 'confirm')).decision, 'ownership-unknown')
  assert.equal(f.attempt().escalation, 'ownership')
  await assert.rejects(assertReconciliationFence(f.req))
  await endReconciliation(f.req, 'completed')
  assert.equal(f.attempt().active?.state, 'unknown')
  assert.equal(f.attempt().ordinaryUsed, 1)
  assert.equal((await admitReconciliation(f.other(), f.identity, 'resume')).decision, 'ownership-unknown')
})

test('provider deadline retains the uncertain debit and late transport cannot reopen ownership', async (t) => {
  const f = await admissionFixture()
  await admitReconciliation(f.req, f.identity, 'confirm')
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let dispatched!: () => void
  let late!: (result: unknown) => void
  const started = new Promise<void>(resolve => { dispatched = resolve })
  const result = accountedProviderGet(f.req, f.identity.paymentID, () => {
    dispatched()
    return new Promise(resolve => { late = resolve })
  })
  await started
  t.mock.timers.tick(10000)
  await assert.rejects(result, /outcome unknown/)
  assert.equal(f.attempt().ordinaryUsed, 1)
  await endReconciliation(f.req, 'unknown')
  late({ status: 'PAID' })
  assert.equal((await admitReconciliation(f.other(), f.identity, 'confirm')).decision, 'ownership-unknown')
  assert.equal(f.attempt().active?.remaining, 1)
})

test('native debit commit failure prevents dispatch and never asserts completion', async () => {
  const f = await admissionFixture()
  await admitReconciliation(f.req, f.identity, 'confirm')
  f.failCommit()
  await assert.rejects(debitProviderGet(f.req, f.identity.paymentID))
  assert.equal(f.attempt().ordinaryUsed, 0)
  assert.equal(f.attempt().active?.remaining, 2)
})

test('global rolling ceiling reserves whole operations and limits delayed dispatch', async () => {
  const f = await admissionFixture()
  await admitReconciliation(f.req, f.identity, 'confirm')
  await debitProviderGet(f.req, f.identity.paymentID)
  await debitProviderGet(f.req, f.identity.paymentID)
  await endReconciliation(f.req, 'completed')
  const second = { ...f.identity, transactionID: randomUUID() }
  second.paymentID = second.transactionID.replaceAll('-', '')
  const req = f.other()
  await admitReconciliation(req, second, 'confirm')
  await debitProviderGet(req, second.paymentID)
  await debitProviderGet(req, second.paymentID)
  await endReconciliation(req, 'completed')
  const third = { ...second, transactionID: randomUUID() }
  third.paymentID = third.transactionID.replaceAll('-', '')
  assert.equal((await admitReconciliation(f.other(), third, 'confirm')).decision, 'rate-stop')
  f.advance(1001)
  assert.equal((await admitReconciliation(f.other(), third, 'confirm')).decision, 'started')
})

test('lifetime and unresolved escalation persist; risk references cannot be erased', async () => {
  const f = await admissionFixture()
  f.advance(1800001)
  assert.equal((await admitReconciliation(f.req, f.identity, 'confirm', f.req.payload, { automatic: true })).decision, 'review-required')
  assert.equal(f.attempt().escalation, 'unresolved')
  const g = await admissionFixture()
  g.advance(86400001)
  assert.equal((await admitReconciliation(g.req, g.identity, 'confirm')).decision, 'lifetime-stop')
  assert.equal(g.attempt().escalation, 'lifetime')
})

test('foreign identity, forged scope and stale tokens cannot debit or publish', async () => {
  const f = await admissionFixture()
  const foreign = f.other()
  foreign.user = { ...foreign.user, id: 'foreign' } as typeof foreign.user
  await assert.rejects(admitReconciliation(foreign, f.identity, 'confirm'))
  await admitReconciliation(f.req, f.identity, 'confirm')
  await assert.rejects(debitProviderGet(f.other(), f.identity.paymentID))
  f.seed({ active: { ...f.attempt().active!, token: randomUUID() } })
  await assert.rejects(debitProviderGet(f.req, f.identity.paymentID))
  await assert.rejects(endReconciliation(f.req, 'completed'))
})
