import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload'
import { createPortOneAdapter, paymentRequest, type PortOneTransaction } from '../../../src/lib/commerce/portone/adapter'
import { commerceSnapshotHash } from '../../../src/lib/commerce/snapshot-hash'
import { inPaymentTransaction } from '../../../src/lib/commerce/_shared/transaction'
import { nativeTransactionFixture } from '../core/native-transaction-fixture'
import { installAccounting } from './admission-fixture'
import { runReconciliation } from '../../../src/lib/commerce/portone/admission'

const transactionID = '91b6495b-479b-4306-98f1-83b729807aea'
const paymentID = transactionID.replaceAll('-', '')
const snapshot = { version: 1 as const, customerID: 'customer-1', cartID: 'cart-1',
  productID: 'product-1', releaseID: 'product-1', eventID: 'event-1', quantity: 1,
  currency: 'KRW' as const, unitAmount: 45000, shippingAmount: 0, totalAmount: 45000,
  orderName: 'Physical product', productVersion: 'v1', eventVersion: 'v1',
  shippingAddress: { country: 'KR' as const, recipientName: 'Recipient', phone: '01012345678', postalCode: '01234', addressLine1: 'Address' } }
const config = { origin: 'http://localhost:3000', storeId: 'store-reviewed', channelKey: 'channel-reviewed',
  apiSecret: 'private-secret', webhookSecret: 'private-webhook', localKpnTestCheckout: true }

async function fixture(inventory = 1, settleWhileLocking = false, admitted = true) {
  let finalized = 0
  let providerCalls = 0
  const row: PortOneTransaction = { id: transactionID, status: 'pending', order: null, customer: snapshot.customerID, cart: snapshot.cartID,
    amount: snapshot.totalAmount, currency: 'KRW', paymentMethod: 'portone', items: [{ product: snapshot.productID, quantity: 1 }],
    commerceReviewHold: false, commerceResolutionConflict: false,
    portone: { paymentID, prepareKey: 'a'.repeat(64), snapshot: structuredClone(snapshot), snapshotHash: commerceSnapshotHash(snapshot),
      storeID: config.storeId, channelKey: config.channelKey } }
  const req = { transactionID: 'real-db-session', user: { id: snapshot.customerID, collection: 'users' }, data: {},
    payload: { findByID: async ({ collection }: { collection: string }) => {
      if (collection !== 'products') return row
      if (settleWhileLocking) { row.status = 'succeeded'; row.order = '91b6495b-479b-4306-98f1-83b729807aeb' }
      return { id: snapshot.productID, inventory, reservedQuantity: 1 }
    },
      find: async () => ({ docs: [{ id: 'reservation-1', customer: snapshot.customerID, product: snapshot.productID,
        event: snapshot.eventID, releaseID: snapshot.releaseID, quantity: snapshot.quantity,
        snapshotHash: commerceSnapshotHash(snapshot), state: 'reserved' }] }),
      db: { name: 'postgres', sessions: { 'real-db-session': { db: { execute: async () => undefined } } },
        findOne: async () => {
          if (settleWhileLocking) { row.status = 'succeeded'; row.order = '91b6495b-479b-4306-98f1-83b729807aeb' }
          return { id: snapshot.productID, inventory, reservedQuantity: 1 }
        } } } } as unknown as PayloadRequest
  const adapter = createPortOneAdapter({ config, reviewedChannel: { storeId: config.storeId, channelKey: config.channelKey },
    getPayment: async () => { providerCalls++; return { id: paymentID, storeId: config.storeId,
      status: 'PAID', channel: { type: 'TEST', key: config.channelKey }, customer: { id: snapshot.customerID },
      currency: 'KRW', amount: { total: 45000, paid: 45000, cancelled: 0 }, disputes: [] } } })
  const native = await nativeTransactionFixture()
  native.adapter.findOne = req.payload.db.findOne
  req.payload.db = native.adapter as unknown as PayloadRequest['payload']['db']
  delete req.transactionID
  if (admitted) await installAccounting(req, { transactionID, paymentID, customerID: snapshot.customerID, cartID: snapshot.cartID, snapshotHash: row.portone.snapshotHash })
  const confirmUnwrapped = async () => adapter.confirmOrder({ data: { transactionID, paymentID, cartID: snapshot.cartID }, req,
    finalizeOrder: async () => { finalized++; return { id: 'order-1' } } })
  const confirm = () => inPaymentTransaction(req, confirmUnwrapped)
  return { req, row, confirm, confirmUnwrapped, finalized: () => finalized, providerCalls: () => providerCalls }
}

test('local review, succeeded and terminal admission stops do not dispatch provider or finalizer work', async () => {
  for (const state of ['held', 'succeeded', 'cancelled'] as const) {
    const f = await fixture(1, false, false)
    if (state === 'held') f.row.commerceReviewHold = true
    else f.row.status = state
    const response = await runReconciliation(f.req, { transactionID, paymentID, cartID: snapshot.cartID }, 'confirm',
      async () => { throw new Error('Local stop must not execute') }, { config, reviewedChannel: config })
    assert.equal(response.status, state === 'succeeded' ? 202 : 409)
    assert.equal(f.providerCalls(), 0)
    assert.equal(f.finalized(), 0)
  }
  const f = await fixture(1, false, false)
  await assert.rejects(runReconciliation(f.req, { transactionID: '91b6495b-479b-4306-98f1-83b729807aeb', paymentID }, 'confirm',
    async () => Response.json({}), { config, reviewedChannel: config }), /Attempt mismatch/)
})

test('unwrapped confirmation requires the private native owner before provider work or writes', async () => {
  const f = await fixture()
  await assert.rejects(f.confirmUnwrapped(), /native transaction owner/)
  const borrowed = await f.req.payload.db.beginTransaction()
  assert.ok(borrowed)
  f.req.transactionID = borrowed
  try { await assert.rejects(f.confirmUnwrapped(), /native transaction owner/) }
  finally { await f.req.payload.db.rollbackTransaction(borrowed); delete f.req.transactionID }
  assert.equal(f.providerCalls(), 0)
  assert.equal(f.finalized(), 0)
})

test('payment request preserves the SDK customer and immutable snapshot shape without provider work', async () => {
  const f = await fixture()
  const before = structuredClone(f.row)
  const expected = { storeId: config.storeId, channelKey: config.channelKey, paymentId: paymentID,
    orderName: snapshot.orderName, totalAmount: snapshot.totalAmount, currency: snapshot.currency,
    redirectUrl: 'http://localhost:3000/shop/payment',
    customer: { customerId: snapshot.customerID, email: 'member@example.com', fullName: 'Member' } }
  assert.deepEqual(paymentRequest(config, f.row, { email: 'member@example.com', name: 'Member' }), expected)
  for (const name of [undefined, null, '']) {
    assert.deepEqual(paymentRequest(config, f.row, { email: 'member@example.com', name }), {
      ...expected, customer: { customerId: snapshot.customerID, email: 'member@example.com' },
    })
  }
  assert.deepEqual(f.row, before)
  assert.equal(f.providerCalls(), 0)
  assert.equal(f.finalized(), 0)
})

test('payment request still rejects missing, empty, malformed and null email via Zod', async () => {
  const f = await fixture()
  for (const customer of [{}, { email: undefined }, { email: '' }, { email: 'not-an-email' }]) {
    assert.throws(() => paymentRequest(config, f.row, customer), { name: 'ZodError' })
  }
  // Exercise a runtime-invalid external value without asserting it is a typed customer.
  assert.throws(() => Reflect.apply(paymentRequest, undefined, [config, f.row, { email: null }]), { name: 'ZodError' })
  assert.equal(f.providerCalls(), 0)
  assert.equal(f.finalized(), 0)
})

test('sold-out own reservation still verifies provider and invokes plugin finalizer once', async () => {
  const f = await fixture()
  const result = await f.confirm()
  assert.equal(result.transactionID, transactionID)
  assert.equal(result.orderID, 'order-1')
  assert.equal(f.finalized(), 1)
  assert.equal(f.providerCalls(), 1)
})

test('corrupted inventory below its own reservation cannot be decremented below zero', async () => {
  const f = await fixture(0)
  await assert.rejects(f.confirm())
  assert.equal(f.finalized(), 0)
})

test('duplicate confirmation rereads settled status before applying the pending inventory guard', async () => {
  const f = await fixture(0, true)
  await f.confirm()
  assert.equal(f.finalized(), 1)
})

test('caller-owned, foreign, changed and processing attempts cannot settle', async () => {
  for (const mutate of [
    (f: Awaited<ReturnType<typeof fixture>>) => { f.req.transactionID = 'invented-session' },
    (f: Awaited<ReturnType<typeof fixture>>) => { f.req.user = { id: 'other' } as PayloadRequest['user'] },
    (f: Awaited<ReturnType<typeof fixture>>) => { f.row.status = 'processing' },
    (f: Awaited<ReturnType<typeof fixture>>) => { f.row.portone.snapshot.totalAmount = 1 },
    (f: Awaited<ReturnType<typeof fixture>>) => { f.row.items[0].quantity = 2 },
  ]) {
    const f = await fixture()
    mutate(f)
    await assert.rejects(f.confirm())
    assert.equal(f.finalized(), 0)
  }
})
