import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload'
import { commerceSnapshotHash } from '../../../src/lib/commerce/snapshot-hash'
import { nativeTransactionFixture } from '../core/native-transaction-fixture'

const endpoints = readFileSync(new URL('../../../src/lib/commerce/portone/endpoints.ts', import.meta.url), 'utf8')
const review = readFileSync(new URL('../../../src/lib/commerce/portone/review.ts', import.meta.url), 'utf8')

test('failed retirement is an explicit authenticated action, not not-found recovery', () => {
  assert.equal(/path: '\/retire'/.test(endpoints), true)
  assert.equal(/await retireFailedPayment/.test(endpoints), true)
  assert.equal(/export async function retireFailedPayment/.test(review), true)
  assert.equal(/verifiedReason: 'verified-failure'/.test(review), true)
  assert.equal(/status: 'failed'/.test(review), true)
})

test('full cancellation records terminal transaction status without clearing its risk hold', () => {
  assert.equal(/risk === 'full-cancel' && !\['failed', 'refunded'\]\.includes\(current.status\) \? \{ status: 'cancelled' \} : \{\}/.test(review), true)
  assert.equal(/commerceReviewHold: false/.test(review), false)
})

test('retirement rejects uncertain or mismatched provider evidence without releasing counters', async () => {
  const { retireFailedPayment } = await import('../../../src/lib/commerce/portone/review')
  const transactionID = '91b6495b-479b-4306-98f1-83b729807aea'
  const paymentID = transactionID.replaceAll('-', '')
  const config = { origin: 'http://localhost:3000', storeId: 'store-reviewed', channelKey: 'channel-reviewed',
    apiSecret: 'private-secret', webhookSecret: 'private-webhook', localKpnTestCheckout: true }
  const snapshot = { version: 1 as const, customerID: 'customer-1', cartID: 'cart-1', productID: 'product-1',
    releaseID: 'product-1', eventID: 'event-1', quantity: 1, currency: 'KRW' as const, unitAmount: 100,
    shippingAmount: 0, totalAmount: 100, orderName: 'Product', productVersion: 'v1', eventVersion: 'v1',
    shippingAddress: { country: 'KR' as const, recipientName: 'Recipient', phone: '01012345678', postalCode: '01234', addressLine1: 'Address' } }
  const row = { id: transactionID, status: 'pending', customer: snapshot.customerID, cart: snapshot.cartID,
    amount: 100, currency: 'KRW', paymentMethod: 'portone', items: [{ product: snapshot.productID, quantity: 1 }],
    portone: { paymentID, prepareKey: 'a'.repeat(64), snapshot, snapshotHash: commerceSnapshotHash(snapshot),
      storeID: config.storeId, channelKey: config.channelKey } }
  const failed = { id: paymentID, status: 'FAILED', storeId: config.storeId, channel: { key: config.channelKey, type: 'TEST' },
    customer: { id: snapshot.customerID }, currency: 'KRW', amount: { total: 100, paid: 0, cancelled: 0 }, disputes: [] }
  for (const evidence of [{ type: 'PAYMENT_NOT_FOUND' }, { ...failed, status: 'READY' }, { ...failed, status: 'PAID' },
    { ...failed, customer: { id: 'other' } }, { ...failed, amount: { total: 101, paid: 0, cancelled: 0 } }, failed]) {
    let writes = 0
    let counterWrites = 0
    let terminalStatus = 'pending'
    const req = { user: { id: snapshot.customerID, collection: 'users' }, payload: {
      findByID: async ({ collection }: { collection: string }) => collection === 'transactions' ? { ...row, status: terminalStatus } : { id: snapshot.eventID, reservedQuantity: 1 },
      find: async ({ collection }: { collection: string }) => ({ docs: [collection === 'commerce-reservations'
        ? { id: 'reservation-1', customer: snapshot.customerID, product: snapshot.productID, event: snapshot.eventID, releaseID: snapshot.releaseID, quantity: 1, state: 'reserved' }
        : { id: 'allowance-1', reservedQuantity: 1 }] }),
      update: async ({ collection, data }: { collection: string; data: { status?: string } }) => {
        writes++
        if (collection === 'transactions') terminalStatus = data.status!
        return { ...row, ...data }
      },
      db: { name: 'postgres', sessions: { 'retire-db': { db: { execute: async () => undefined } } },
        findOne: async () => ({ id: snapshot.productID, reservedQuantity: 1 }),
        updateOne: async () => { counterWrites++; return {} }, beginTransaction: async () => 'retire-db',
        commitTransaction: async () => undefined, rollbackTransaction: async () => undefined },
    } } as unknown as PayloadRequest
    const native = await nativeTransactionFixture()
    native.adapter.findOne = req.payload.db.findOne
    native.adapter.updateOne = req.payload.db.updateOne
    req.payload.db = native.adapter as unknown as PayloadRequest['payload']['db']
    const deps = { config, reviewedChannel: config, getPayment: async () => evidence }
    if (evidence === failed) {
      await retireFailedPayment(req, { transactionID, paymentID }, deps)
      assert.equal(terminalStatus, 'failed')
      assert.equal(writes, 3)
      assert.equal(counterWrites, 2)
      await retireFailedPayment(req, { transactionID, paymentID }, deps)
      assert.equal(writes, 3)
      assert.equal(counterWrites, 2)
    } else {
      await assert.rejects(retireFailedPayment(req, { transactionID, paymentID }, deps))
      assert.equal(writes, 0)
      assert.equal(counterWrites, 0)
    }
  }
})
