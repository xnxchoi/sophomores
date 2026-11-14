import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload'
import { assertPaymentRiskReviewed, deferPaymentRisk, flushDeferredPaymentRisk, PaymentReviewRequired } from '../../../src/lib/commerce/portone/review'
import { createAdapterEndpoints } from '../../../src/lib/commerce/portone/endpoints'
import { commerceSnapshotHash } from '../../../src/lib/commerce/snapshot-hash'
import { inPaymentTransaction } from '../../../src/lib/commerce/_shared/transaction'
import { nativeTransactionFixture, type NativeFaults } from '../core/native-transaction-fixture'
import { installAccounting, installEndpointLedger } from './admission-fixture'

const transactionID = '91b6495b-479b-4306-98f1-83b729807aea'
const paymentID = transactionID.replaceAll('-', '')
const config = { mode: "test" as const, origin: 'http://localhost:3000', storeId: 'store-reviewed', channelKey: 'channel-reviewed',
  apiSecret: 'private-secret', webhookSecret: 'private-webhook', localKpnTestCheckout: true }
const snapshot = { version: 1 as const, customerID: 'customer-1', cartID: 'cart-1', productID: 'product-1',
  releaseID: 'product-1', eventID: 'event-1', quantity: 1, currency: 'KRW' as const, unitAmount: 100,
  shippingAmount: 0, totalAmount: 100, orderName: 'Product', productVersion: 'v1', eventVersion: 'v1',
  shippingAddress: { country: 'KR' as const, recipientName: 'Recipient', phone: '01012345678', postalCode: '01234', addressLine1: 'Address' } }
async function fixture(status = 'pending', reservationState = 'reserved', retiresWhileWaitingForLock = false, faults: NativeFaults = {}) {
  let writes = 0
  let commits = 0
  let begins = 0
  let locked = false
  const row = { id: transactionID, createdAt: new Date().toISOString(), status, customer: snapshot.customerID, cart: snapshot.cartID,
    amount: 100, currency: 'KRW', paymentMethod: 'portone', items: [{ product: snapshot.productID, quantity: 1 }],
    portone: { paymentID, prepareKey: 'a'.repeat(64), snapshot, snapshotHash: commerceSnapshotHash(snapshot),
      storeID: config.storeId, channelKey: config.channelKey } }
  const req = { user: { id: snapshot.customerID, collection: 'users' }, payload: {
    findByID: async ({ collection }: { collection: string }) => collection === 'transactions' ? { ...row, status: retiresWhileWaitingForLock && locked ? 'failed' : status }
      : collection === 'users' ? { id: snapshot.customerID, email: 'member@example.com' } : { id: collection },
    find: async ({ collection }: { collection: string }) => ({ docs: [collection === 'commerce-reservations'
      ? { id: 'reservation-1', attemptID: transactionID, customer: snapshot.customerID, product: snapshot.productID, event: snapshot.eventID,
        releaseID: snapshot.releaseID, quantity: 1, snapshotHash: commerceSnapshotHash(snapshot), state: retiresWhileWaitingForLock && locked ? 'released' : reservationState }
      : { id: 'allowance-1' }] }),
    update: async ({ data }: { data: unknown }) => { writes++; assert.deepEqual(data,
      status === 'pending' && reservationState !== 'released' && !retiresWhileWaitingForLock ? { commerceReviewHold: true }
        : { commerceReviewHold: true, commerceResolutionConflict: true }); return row },
    db: { name: 'postgres', sessions: { 'review-db': { db: { execute: async () => { locked = true } } } },
      findOne: async () => ({ id: snapshot.productID, inventory: 1, reservedQuantity: 1 }),
      beginTransaction: async () => { begins++; return 'review-db' }, commitTransaction: async () => { commits++ }, rollbackTransaction: async () => undefined },
  } } as unknown as PayloadRequest
  const native = await nativeTransactionFixture({ ...faults, onQuery: async (kind) => {
    if (kind === 'begin') begins++
    if (kind === 'commit') commits++
    if (kind === 'select') locked = true
    await faults.onQuery?.(kind)
  } })
  native.adapter.findOne = req.payload.db.findOne
  req.payload.db = native.adapter as unknown as PayloadRequest['payload']['db']
  const accounting = await installAccounting(req, { transactionID, paymentID, customerID: snapshot.customerID, cartID: snapshot.cartID, snapshotHash: row.portone.snapshotHash })
  const evidence = { id: paymentID, storeId: config.storeId, status: 'PAID', channel: { type: 'TEST', key: config.channelKey },
    customer: { id: snapshot.customerID }, currency: 'KRW', amount: { total: 100, paid: 100, cancelled: 0 }, disputes: [{}] }
  return { req, evidence, accounting, adapter: native.adapter, events: native.events, counts: () => ({ writes, commits, begins }) }
}

test('exact PAID observed before a concurrent retirement is decided only after the retirement lock releases', async () => {
  const f = await fixture('pending', 'reserved', true)
  await assert.rejects(assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, undefined, {
    config, getPayment: async () => ({ ...f.evidence, disputes: [] }),
  }))
  assert.deepEqual(f.counts(), { writes: 1, commits: 1, begins: 1 })
})

test('ordinary exact PAID commits its locked clear decision without quarantine writes', async () => {
  const f = await fixture()
  await assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, undefined, {
    config, getPayment: async () => ({ ...f.evidence, disputes: [] }),
  })
  assert.deepEqual(f.counts(), { writes: 0, commits: 1, begins: 1 })
  assert.equal(f.req.transactionID === undefined, true)
})

test('late exact PAID on retired or released attempt commits a durable unresolved conflict without settlement', async () => {
  for (const [status, reservationState] of [['failed', 'released'], ['cancelled', 'released'], ['refunded', 'released'], ['pending', 'released']]) {
    const f = await fixture(status, reservationState)
    await assert.rejects(assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, undefined, {
      config, getPayment: async () => ({ ...f.evidence, disputes: [] }),
    }))
    assert.deepEqual(f.counts(), { writes: 1, commits: 1, begins: 1 })
  }
})

test('verified risk holds commit independently before the confirmation rejection', async () => {
  const f = await fixture()
  await assert.rejects(assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, 'signed-event-1', {
    config, getPayment: async () => f.evidence,
  }))
  assert.deepEqual(f.counts(), { writes: 1, commits: 1, begins: 1 })
  assert.equal(f.req.transactionID === undefined, true)
})

test('second-GET risk survives official rollback and never depends on a masking third provider GET', async () => {
  const f = await fixture()
  let thirdGets = 0
  await assert.rejects(inPaymentTransaction(f.req, async () => {
    deferPaymentRisk(f.req, { transactionID, paymentID }, { ...f.evidence, method: { card: { number: 'must-not-retain' } } }, {
      config, getPayment: async () => { thirdGets++; return { ...f.evidence, disputes: [] } },
    })
    throw new Error('second-read risk')
  }))
  // Native rollback acknowledgement, not deletion of a mocked request ID.
  await assert.rejects(flushDeferredPaymentRisk(f.req))
  assert.deepEqual(f.counts(), { writes: 1, commits: 1, begins: 2 })
  assert.equal(thirdGets, 0)
  await flushDeferredPaymentRisk(f.req)
  assert.deepEqual(f.counts(), { writes: 1, commits: 1, begins: 2 })
})

test('signed partial cancellation triggers authoritative GET and commits a risk hold', async () => {
  const f = await fixture()
  const event = { type: 'Transaction.PartialCancelled', data: { paymentId: paymentID, storeId: config.storeId } }
  let gets = 0
  const req = Object.assign(new Request('http://localhost:3000/api/payments/portone/webhooks', { method: 'POST',
    headers: { 'content-type': 'application/json', 'webhook-id': 'partial-1', 'webhook-timestamp': '1', 'webhook-signature': 'verified' },
    body: JSON.stringify(event) }), { payload: { ...f.req.payload,
      config: { endpoints: [{ path: '/payments/portone/confirm-order', method: 'post', handler: async () => { throw new Error('Risk must not finalize') } }] },
    }, user: null }) as unknown as PayloadRequest
  const journal = installEndpointLedger(req)
  const webhook = createAdapterEndpoints({ config, verifyWebhook: async () => event,
    getPayment: async () => { gets++; return { ...f.evidence, status: 'PARTIAL_CANCELLED', amount: { total: 100, paid: 100, cancelled: 50 } } },
  }).find((endpoint) => endpoint.path === '/webhooks')!
  assert.equal((await webhook.handler(req)).status, 409)
  assert.equal(gets, 1)
  const recorded = [...journal.values()].find(row => row.scope === `reconciliation-attempt:${transactionID}`)!.state as { riskProofs?: unknown[] }
  assert.equal(recorded.riskProofs?.length, 1)
  assert.deepEqual(f.counts(), { writes: 1, commits: 7, begins: 7 })
})

test('provider identity mismatch and foreign owner cannot create any local hold writes', async () => {
  for (const patch of [{ storeId: 'other' }, { customer: { id: 'other' } }, { currency: 'USD' }]) {
    const f = await fixture()
    await assert.rejects(assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, 'signed-event-1', {
      config, getPayment: async () => ({ ...f.evidence, ...patch }),
    }))
    assert.deepEqual(f.counts(), { writes: 0, commits: 0, begins: 0 })
  }
  const f = await fixture()
  f.req.user = { id: 'other', collection: 'users' } as PayloadRequest['user']
  await assert.rejects(assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, 'signed-event-1', {
    config, getPayment: async () => f.evidence,
  }))
  assert.deepEqual(f.counts(), { writes: 0, commits: 0, begins: 0 })
})

test('quarantine COMMIT failure is unknown, not PaymentReviewRequired, and observed risk blocks another GET', async () => {
  const f = await fixture('pending', 'reserved', false, { commitError: new Error('quarantine commit lost') })
  let gets = 0
  const deps = { config, getPayment: async () => { gets++; return f.evidence } }
  await assert.rejects(assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, undefined, deps), (error: unknown) => {
    assert.equal(error instanceof PaymentReviewRequired, false)
    assert.match(String(error), /outcome unknown/i)
    return true
  })
  await assert.rejects(assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, undefined, deps), /risk remains unresolved/)
  assert.equal(gets, 1)
  assert.deepEqual(f.events.slice(-2), ['commit', 'rollback'])
  assert.equal(f.accounting.attempt().riskProofs.length, 1)
})

test('deferred second-read risk cannot quarantine after unacknowledged settlement rollback', async () => {
  const f = await fixture('pending', 'reserved', false, { rollbackError: new Error('rollback lost') })
  await assert.rejects(inPaymentTransaction(f.req, async () => {
    deferPaymentRisk(f.req, { transactionID, paymentID }, f.evidence, { config })
    throw new Error('observed dispute')
  }), /outcome unknown/)
  await assert.rejects(flushDeferredPaymentRisk(f.req), /rollback acknowledgement/)
  await assert.rejects(flushDeferredPaymentRisk(f.req), /rollback acknowledgement/)
  assert.deepEqual(f.counts(), { writes: 0, commits: 0, begins: 1 })
})

test('deferred risk survives a pre-transaction quarantine failure and later clear observations', async () => {
  const f = await fixture()
  const deps: Parameters<typeof deferPaymentRisk>[3] = { config: null,
    getPayment: async () => { throw new Error('no third provider read') } }
  await assert.rejects(inPaymentTransaction(f.req, async () => {
    deferPaymentRisk(f.req, { transactionID, paymentID }, f.evidence, deps)
    deferPaymentRisk(f.req, { transactionID, paymentID }, { ...f.evidence, disputes: [] }, deps)
    throw new Error('observed dispute')
  }))
  await assert.rejects(flushDeferredPaymentRisk(f.req), /channel unavailable/)
  assert.equal(f.counts().writes, 0)
  deps.config = config
  await assert.rejects(flushDeferredPaymentRisk(f.req), PaymentReviewRequired)
  assert.equal(f.counts().writes, 1, 'the original dispute, not the later clear observation, must be held')
  await flushDeferredPaymentRisk(f.req)
  assert.equal(f.counts().writes, 1)
})
