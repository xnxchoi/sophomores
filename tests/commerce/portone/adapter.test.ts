import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload'
import { createPortOneAdapter } from '../../../src/lib/commerce/portone/adapter'
import { commerceSnapshotHash } from '../../../src/lib/commerce/snapshot-hash'

const transactionID = '91b6495b-479b-4306-98f1-83b729807aea'
const paymentID = transactionID.replaceAll('-', '')
const snapshot = { version: 1 as const, customerID: 'customer-1', cartID: 'cart-1',
  productID: 'product-1', releaseID: 'product-1', eventID: 'event-1', quantity: 1,
  currency: 'KRW' as const, unitAmount: 45000, shippingAmount: 0, totalAmount: 45000,
  orderName: 'Physical product', productVersion: 'v1', eventVersion: 'v1',
  shippingAddress: { country: 'KR' as const, recipientName: 'Recipient', phone: '01012345678', postalCode: '01234', addressLine1: 'Address' } }
const config = { origin: 'http://localhost:3000', storeId: 'store-reviewed', channelKey: 'channel-reviewed',
  apiSecret: 'private-secret', webhookSecret: 'private-webhook', localKpnTestCheckout: true }

function fixture(inventory = 1, settleWhileLocking = false) {
  let finalized = 0
  let providerCalls = 0
  const row = { id: transactionID, status: 'pending', order: null as string | null, customer: snapshot.customerID, cart: snapshot.cartID,
    amount: snapshot.totalAmount, currency: 'KRW', paymentMethod: 'portone', items: [{ product: snapshot.productID, quantity: 1 }],
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
  const confirm = async () => adapter.confirmOrder({ data: { transactionID, paymentID, cartID: snapshot.cartID }, req,
    finalizeOrder: async () => { finalized++; return { id: 'order-1' } } })
  return { req, row, confirm, finalized: () => finalized, providerCalls: () => providerCalls }
}

test('sold-out own reservation still verifies provider and invokes plugin finalizer once', async () => {
  const f = fixture()
  const result = await f.confirm()
  assert.equal(result.transactionID, transactionID)
  assert.equal(result.orderID, 'order-1')
  assert.equal(f.finalized(), 1)
  assert.equal(f.providerCalls(), 1)
})

test('corrupted inventory below its own reservation cannot be decremented below zero', async () => {
  const f = fixture(0)
  await assert.rejects(f.confirm())
  assert.equal(f.finalized(), 0)
})

test('duplicate confirmation rereads settled status before applying the pending inventory guard', async () => {
  const f = fixture(0, true)
  await f.confirm()
  assert.equal(f.finalized(), 1)
})

test('transactionless, foreign, changed and processing attempts cannot settle', async () => {
  for (const mutate of [
    (f: ReturnType<typeof fixture>) => { f.req.transactionID = undefined },
    (f: ReturnType<typeof fixture>) => { f.req.user = { id: 'other' } as PayloadRequest['user'] },
    (f: ReturnType<typeof fixture>) => { f.row.status = 'processing' },
    (f: ReturnType<typeof fixture>) => { f.row.portone.snapshot.totalAmount = 1 },
    (f: ReturnType<typeof fixture>) => { f.row.items[0].quantity = 2 },
  ]) {
    const f = fixture()
    mutate(f)
    await assert.rejects(f.confirm())
    assert.equal(f.finalized(), 0)
  }
})
