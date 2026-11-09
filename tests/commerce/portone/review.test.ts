import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload'
import { assertPaymentRiskReviewed, deferPaymentRisk, flushDeferredPaymentRisk } from '../../../src/lib/commerce/portone/review'
import { createAdapterEndpoints } from '../../../src/lib/commerce/portone/endpoints'
import { commerceSnapshotHash } from '../../../src/lib/commerce/snapshot-hash'

const transactionID = '91b6495b-479b-4306-98f1-83b729807aea'
const paymentID = transactionID.replaceAll('-', '')
const config = { origin: 'http://localhost:3000', storeId: 'store-reviewed', channelKey: 'channel-reviewed',
  apiSecret: 'private-secret', webhookSecret: 'private-webhook', localKpnTestCheckout: true }
const snapshot = { version: 1 as const, customerID: 'customer-1', cartID: 'cart-1', productID: 'product-1',
  releaseID: 'product-1', eventID: 'event-1', quantity: 1, currency: 'KRW' as const, unitAmount: 100,
  shippingAmount: 0, totalAmount: 100, orderName: 'Product', productVersion: 'v1', eventVersion: 'v1',
  shippingAddress: { country: 'KR' as const, recipientName: 'Recipient', phone: '01012345678', postalCode: '01234', addressLine1: 'Address' } }
function fixture(status = 'pending', reservationState = 'reserved', retiresWhileWaitingForLock = false) {
  let writes = 0
  let commits = 0
  let begins = 0
  let locked = false
  const row = { id: transactionID, status, customer: snapshot.customerID, cart: snapshot.cartID,
    amount: 100, currency: 'KRW', paymentMethod: 'portone', items: [{ product: snapshot.productID, quantity: 1 }],
    portone: { paymentID, prepareKey: 'a'.repeat(64), snapshot, snapshotHash: commerceSnapshotHash(snapshot),
      storeID: config.storeId, channelKey: config.channelKey } }
  const req = { user: { id: snapshot.customerID, collection: 'users' }, payload: {
    findByID: async ({ collection }: { collection: string }) => collection === 'transactions' ? { ...row, status: retiresWhileWaitingForLock && locked ? 'failed' : status }
      : collection === 'users' ? { id: snapshot.customerID, email: 'member@example.com' } : { id: collection },
    find: async ({ collection }: { collection: string }) => ({ docs: [collection === 'commerce-reservations'
      ? { id: 'reservation-1', customer: snapshot.customerID, product: snapshot.productID, event: snapshot.eventID,
        releaseID: snapshot.releaseID, quantity: 1, snapshotHash: commerceSnapshotHash(snapshot), state: retiresWhileWaitingForLock && locked ? 'released' : reservationState }
      : { id: 'allowance-1' }] }),
    update: async ({ data }: { data: unknown }) => { writes++; assert.deepEqual(data,
      status === 'pending' && reservationState !== 'released' && !retiresWhileWaitingForLock ? { commerceReviewHold: true }
        : { commerceReviewHold: true, commerceResolutionConflict: true }); return row },
    db: { name: 'postgres', sessions: { 'review-db': { db: { execute: async () => { locked = true } } } },
      findOne: async () => ({ id: snapshot.productID, inventory: 1, reservedQuantity: 1 }),
      beginTransaction: async () => { begins++; return 'review-db' }, commitTransaction: async () => { commits++ }, rollbackTransaction: async () => undefined },
  } } as unknown as PayloadRequest
  const evidence = { id: paymentID, storeId: config.storeId, status: 'PAID', channel: { type: 'TEST', key: config.channelKey },
    customer: { id: snapshot.customerID }, currency: 'KRW', amount: { total: 100, paid: 100, cancelled: 0 }, disputes: [{}] }
  return { req, evidence, counts: () => ({ writes, commits, begins }) }
}

test('exact PAID observed before a concurrent retirement is decided only after the retirement lock releases', async () => {
  const f = fixture('pending', 'reserved', true)
  await assert.rejects(assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, undefined, {
    config, reviewedChannel: config, getPayment: async () => ({ ...f.evidence, disputes: [] }),
  }))
  assert.deepEqual(f.counts(), { writes: 1, commits: 1, begins: 1 })
})

test('ordinary exact PAID commits its locked clear decision without quarantine writes', async () => {
  const f = fixture()
  await assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, undefined, {
    config, reviewedChannel: config, getPayment: async () => ({ ...f.evidence, disputes: [] }),
  })
  assert.deepEqual(f.counts(), { writes: 0, commits: 1, begins: 1 })
  assert.equal(f.req.transactionID === undefined, true)
})

test('late exact PAID on retired or released attempt commits a durable unresolved conflict without settlement', async () => {
  for (const [status, reservationState] of [['failed', 'released'], ['cancelled', 'released'], ['refunded', 'released'], ['pending', 'released']]) {
    const f = fixture(status, reservationState)
    await assert.rejects(assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, undefined, {
      config, reviewedChannel: config, getPayment: async () => ({ ...f.evidence, disputes: [] }),
    }))
    assert.deepEqual(f.counts(), { writes: 1, commits: 1, begins: 1 })
  }
})

test('verified risk holds commit independently before the confirmation rejection', async () => {
  const f = fixture()
  await assert.rejects(assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, 'signed-event-1', {
    config, reviewedChannel: config, getPayment: async () => f.evidence,
  }))
  assert.deepEqual(f.counts(), { writes: 1, commits: 1, begins: 1 })
  assert.equal(f.req.transactionID === undefined, true)
})

test('second-GET risk survives official rollback and never depends on a masking third provider GET', async () => {
  const f = fixture()
  let thirdGets = 0
  deferPaymentRisk(f.req, { transactionID, paymentID }, { ...f.evidence, method: { card: { number: 'must-not-retain' } } }, {
    config, reviewedChannel: config, getPayment: async () => { thirdGets++; return { ...f.evidence, disputes: [] } },
  })
  // Represents the real generated handler having killed its owned settlement
  // transaction. The next write must own a separate quarantine transaction.
  await assert.rejects(flushDeferredPaymentRisk(f.req))
  assert.deepEqual(f.counts(), { writes: 1, commits: 1, begins: 1 })
  assert.equal(thirdGets, 0)
  await flushDeferredPaymentRisk(f.req)
  assert.deepEqual(f.counts(), { writes: 1, commits: 1, begins: 1 })
})

test('signed partial cancellation triggers authoritative GET and commits a risk hold', async () => {
  const f = fixture()
  const event = { type: 'Transaction.PartialCancelled', data: { paymentId: paymentID, storeId: config.storeId } }
  let gets = 0
  const req = Object.assign(new Request('http://localhost:3000/api/payments/portone/webhooks', { method: 'POST',
    headers: { 'content-type': 'application/json', 'webhook-id': 'partial-1', 'webhook-timestamp': '1', 'webhook-signature': 'verified' },
    body: JSON.stringify(event) }), { payload: { ...f.req.payload,
      config: { endpoints: [{ path: '/payments/portone/confirm-order', method: 'post', handler: async () => { throw new Error('Risk must not finalize') } }] },
    }, user: null }) as unknown as PayloadRequest
  const webhook = createAdapterEndpoints({ config, reviewedChannel: config, verifyWebhook: async () => event,
    getPayment: async () => { gets++; return { ...f.evidence, status: 'PARTIAL_CANCELLED', amount: { total: 100, paid: 100, cancelled: 50 } } },
  }).find((endpoint) => endpoint.path === '/webhooks')!
  assert.equal((await webhook.handler(req)).status, 409)
  assert.equal(gets, 1)
  assert.deepEqual(f.counts(), { writes: 1, commits: 1, begins: 1 })
})

test('provider identity mismatch and foreign owner cannot create any local hold writes', async () => {
  for (const patch of [{ storeId: 'other' }, { customer: { id: 'other' } }, { currency: 'USD' }]) {
    const f = fixture()
    await assert.rejects(assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, 'signed-event-1', {
      config, reviewedChannel: config, getPayment: async () => ({ ...f.evidence, ...patch }),
    }))
    assert.deepEqual(f.counts(), { writes: 0, commits: 0, begins: 0 })
  }
  const f = fixture()
  f.req.user = { id: 'other', collection: 'users' } as PayloadRequest['user']
  await assert.rejects(assertPaymentRiskReviewed(f.req, { transactionID, paymentID }, 'signed-event-1', {
    config, reviewedChannel: config, getPayment: async () => f.evidence,
  }))
  assert.deepEqual(f.counts(), { writes: 0, commits: 0, begins: 0 })
})
