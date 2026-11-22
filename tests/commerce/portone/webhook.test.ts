import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHmac, randomBytes } from 'node:crypto'
import type { PayloadRequest } from 'payload'
import { createAdapterEndpoints, isVerifiedCommerceWebhook } from '../../../src/lib/commerce/portone/endpoints'
import { commerceSnapshotHash } from '../../../src/lib/commerce/snapshot-hash'
import { nativeTransactionFixture } from '../core/native-transaction-fixture'
import { installEndpointLedger } from './endpoint-ledger-fixture'

const transactionID = '91b6495b-479b-4306-98f1-83b729807aea'
const paymentID = transactionID.replaceAll('-', '')
const config = { mode: "test" as const, origin: 'http://localhost:3000', storeId: 'store-reviewed', channelKey: 'channel-reviewed',
  apiSecret: 'private-secret', webhookSecret: 'private-webhook', localKpnTestCheckout: true }
const snapshot = { version: 1 as const, customerID: 'customer-1', cartID: 'cart-1', productID: 'product-1',
  releaseID: 'membership' as const, accountLimit: 1, eventID: 'event-1', quantity: 1, currency: 'KRW' as const, unitAmount: 100,
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
    payload: { find: async ({ collection }: { collection: string }) => ({ docs: collection === 'orders' ? [] : [collection === 'commerce-reservations'
      ? { id: 'reservation-1', attemptID: transactionID, state: 'reserved', customer: snapshot.customerID, product: snapshot.productID,
        event: snapshot.eventID, releaseID: snapshot.releaseID, snapshotHash: commerceSnapshotHash(snapshot), quantity: 1 }
      : { id: 'allowance-1' }] }),
      db: { name: 'postgres', sessions: { 'webhook-db': { db: { execute: async () => undefined } } },
        findOne: async () => ({ id: snapshot.productID }), beginTransaction: async () => 'webhook-db',
        commitTransaction: async () => undefined, rollbackTransaction: async () => undefined },
      findByID: async ({ collection }: { collection: string }) => collection === 'users'
      ? { id: snapshot.customerID, email: 'member@example.com' }
      : { id: transactionID, createdAt: new Date().toISOString(), status: 'pending', customer: snapshot.customerID, cart: snapshot.cartID,
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
  req.payload.db = native.adapter as unknown as PayloadRequest['payload']['db']
  installEndpointLedger(req)
  const endpoint = createAdapterEndpoints({ config,
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
  const endpoint = createAdapterEndpoints({ config }).find((item) => item.path === '/webhooks')!
  assert.equal((await endpoint.handler(req)).status, 409)
  assert.equal(isVerifiedCommerceWebhook(req), false)
})

test('the installed SDK rejects raw-body modification and stale signatures before any Payload read or write', async () => {
  const key = randomBytes(32)
  const endpoint = createAdapterEndpoints({ config: { ...config, webhookSecret: 'whsec_' + key.toString('base64') },
    getPayment: async () => { assert.fail('No provider GET may run') } }).find(item => item.path === '/webhooks')!
  const raw = JSON.stringify({ type: 'Transaction.Paid', data: { paymentId: paymentID, storeId: config.storeId } })
  const now = Math.floor(Date.now() / 1000)
  for (const { body, timestamp } of [{ body: raw + '\n', timestamp: now }, { body: raw, timestamp: now - 3600 }]) {
    const signature = createHmac('sha256', key).update(`event-raw.${timestamp}.${raw}`).digest('base64')
    let payloadAccess = 0
    const req = Object.assign(new Request(config.origin + '/api/payments/portone/webhooks', { method: 'POST',
      headers: { 'content-type': 'application/json', 'webhook-id': 'event-raw',
        'webhook-timestamp': String(timestamp), 'webhook-signature': 'v1,' + signature }, body }),
    { payload: new Proxy({}, { get: () => { payloadAccess++; throw new Error('Unexpected Payload access') } }) }) as unknown as PayloadRequest
    assert.equal((await endpoint.handler(req)).status, 409)
    assert.equal(payloadAccess, 0)
  }
})
