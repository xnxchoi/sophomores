import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload'
import { createAdapterEndpoints, isVerifiedCommerceWebhook } from '../../../src/lib/commerce/portone/endpoints'
import { commerceSnapshotHash } from '../../../src/lib/commerce/snapshot-hash'
import { nativeTransactionFixture } from '../core/native-transaction-fixture'

const transactionID = '91b6495b-479b-4306-98f1-83b729807aea'
const paymentID = transactionID.replaceAll('-', '')
const config = { origin: 'http://localhost:3000', storeId: 'store-reviewed', channelKey: 'channel-reviewed',
  apiSecret: 'private-secret', webhookSecret: 'private-webhook', localKpnTestCheckout: true }
const snapshot = { version: 1 as const, customerID: 'customer-1', cartID: 'cart-1', productID: 'product-1',
  releaseID: 'product-1', eventID: 'event-1', quantity: 1, currency: 'KRW' as const, unitAmount: 100,
  shippingAmount: 0, totalAmount: 100, orderName: 'Physical product', productVersion: 'v1', eventVersion: 'v1',
  shippingAddress: { country: 'KR' as const, recipientName: 'Recipient', phone: '01012345678', postalCode: '01234', addressLine1: 'Address' } }

test('signed webhook dispatches the same configured generated handler on the same native request', async () => {
  const signed = { type: 'Transaction.Paid', data: { paymentId: paymentID, storeId: config.storeId } }
  let dispatched = 0
  let verifiedRaw = ''
  const request = new Request('http://localhost:3000/api/payments/portone/webhooks', { method: 'POST',
    headers: { 'content-type': 'application/json', 'webhook-id': 'event-1', 'webhook-timestamp': '1', 'webhook-signature': 'verified' },
    body: JSON.stringify(signed) })
  const req = Object.assign(request, { user: null, data: undefined,
    payload: { find: async ({ collection }: { collection: string }) => ({ docs: [collection === 'commerce-reservations'
      ? { id: 'reservation-1', state: 'reserved', customer: snapshot.customerID, product: snapshot.productID,
        event: snapshot.eventID, releaseID: snapshot.releaseID }
      : { id: 'allowance-1' }] }),
      db: { name: 'postgres', sessions: { 'webhook-db': { db: { execute: async () => undefined } } },
        findOne: async () => ({ id: snapshot.productID }), beginTransaction: async () => 'webhook-db',
        commitTransaction: async () => undefined, rollbackTransaction: async () => undefined },
      findByID: async ({ collection }: { collection: string }) => collection === 'users'
      ? { id: snapshot.customerID, email: 'member@example.com' }
      : { id: transactionID, status: 'pending', customer: snapshot.customerID, cart: snapshot.cartID,
        amount: 100, currency: 'KRW', paymentMethod: 'portone', items: [{ product: snapshot.productID, quantity: 1 }],
        portone: { paymentID, prepareKey: 'a'.repeat(64), snapshot, snapshotHash: commerceSnapshotHash(snapshot),
          storeID: config.storeId, channelKey: config.channelKey } },
      config: { endpoints: [{ path: '/payments/portone/confirm-order', method: 'post', handler: async (same: PayloadRequest) => {
        dispatched++
        assert.equal(same === req, true)
        assert.equal(isVerifiedCommerceWebhook(same), true)
        assert.deepEqual(JSON.parse(await same.text!()), { transactionID, paymentID, cartID: snapshot.cartID })
        assert.equal(same.user?.id, snapshot.customerID)
        return Response.json({ orderID: 'order-1' })
      } }] } } }) as unknown as PayloadRequest
  const text = req.text
  const native = await nativeTransactionFixture()
  native.adapter.findOne = req.payload.db.findOne
  req.payload.db = native.adapter
  const endpoint = createAdapterEndpoints({ config, reviewedChannel: config,
    getPayment: async () => ({ id: paymentID, storeId: config.storeId, status: 'PAID',
      channel: { type: 'TEST', key: config.channelKey }, customer: { id: snapshot.customerID },
      currency: 'KRW', amount: { total: 100, paid: 100, cancelled: 0 }, disputes: [] }),
    verifyWebhook: async (raw) => { verifiedRaw = raw; return signed } }).find((item) => item.path === '/webhooks')!
  const result = await endpoint.handler(req)
  assert.equal(result.status, 200)
  assert.equal(dispatched, 1)
  assert.equal(verifiedRaw, JSON.stringify(signed))
  assert.equal(isVerifiedCommerceWebhook(req), false)
  assert.equal(req.user === null, true)
  assert.equal(req.data === undefined, true)
  assert.equal(req.text === text, true)
})

test('unsigned requests never receive the webhook capability', async () => {
  const req = Object.assign(new Request('http://localhost:3000/api/payments/portone/webhooks', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{}' }), { payload: {} }) as unknown as PayloadRequest
  const endpoint = createAdapterEndpoints({ config, reviewedChannel: config }).find((item) => item.path === '/webhooks')!
  assert.equal((await endpoint.handler(req)).status, 409)
  assert.equal(isVerifiedCommerceWebhook(req), false)
})
