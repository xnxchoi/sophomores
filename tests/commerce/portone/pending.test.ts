import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload'
import { createPendingEndpoint } from '../../../src/lib/commerce/portone/pending'

const customerID = '91b6495b-479b-4306-98f1-83b729807aea'
const otherID = '91b6495b-479b-4306-98f1-83b729807aeb'
const productID = '91b6495b-479b-4306-98f1-83b729807aec'
const cartID = '91b6495b-479b-4306-98f1-83b729807aed'
const row = (id = '91b6495b-479b-4306-98f1-83b729807aee') => ({ id, customer: customerID, cart: cartID,
  amount: 12345, currency: 'KRW', status: 'pending', commerceReviewHold: false, commerceResolutionConflict: false, paymentMethod: 'portone',
  items: [{ product: productID, quantity: 1 }], portone: { paymentID: id.replaceAll('-', ''),
    prepareKey: 'private-attempt-key', snapshot: { shippingAddress: { addressLine1: 'private address' } } },
  customerEmail: 'private@example.com' })
function fixture(url = 'http://localhost:3000/api/payments/portone/pending', docs = [row()]) {
  let finds = 0
  let query: unknown
  const req = Object.assign(new Request(url, { headers: { 'sec-fetch-site': 'same-origin' } }), {
    user: { id: customerID, collection: 'users' }, payload: { find: async (input: unknown) => { finds++; query = input; return { docs } } },
  }) as unknown as PayloadRequest
  return { req, finds: () => finds, query: () => query }
}

test('discovery returns every bounded own pending/processing/held attempt with an explicit non-PII projection', async () => {
  const second = { ...row('91b6495b-479b-4306-98f1-83b729807aef'), status: 'processing' }
  const held = { ...row('91b6495b-479b-4306-98f1-83b729807af0'), status: 'succeeded', commerceReviewHold: true }
  const foreign = { ...row('91b6495b-479b-4306-98f1-83b729807af1'), customer: otherID }
  const f = fixture(`http://localhost:3000/api/payments/portone/pending?productID=${productID}`, [row(), second, held, foreign])
  const result = await createPendingEndpoint(async () => customerID).handler(f.req)
  assert.equal(result.status, 200)
  const data = await result.json()
  assert.equal(data.attempts.length, 3)
  assert.deepEqual(Object.keys(data.attempts[0]).sort(), ['transactionID', 'paymentID', 'cartID', 'productID', 'quantity', 'totalAmount', 'currency', 'status', 'reviewHold', 'resolutionConflict'].sort())
  assert.equal(JSON.stringify(data).includes('private'), false)
  assert.equal(JSON.stringify(data).includes(otherID), false)
  assert.equal(data.attempts[2].reviewHold, true)
  assert.equal(JSON.stringify(f.query()).includes(customerID), true)
  assert.equal(JSON.stringify(f.query()).includes(productID), true)
  assert.equal(result.headers.get('cache-control'), 'private, no-store')
})

test('terminal held transactions remain history rather than unresolved checkout attempts', async () => {
  const terminal = ['failed', 'cancelled', 'refunded'].map((status) => ({ ...row(), status, commerceReviewHold: true }))
  const f = fixture(undefined, terminal)
  const result = await createPendingEndpoint(async () => customerID).handler(f.req)
  assert.equal(result.status, 200)
  assert.deepEqual((await result.json()).attempts, [])
})

test('terminal payment resolution conflicts stay discoverable until manual resolution', async () => {
  const f = fixture(undefined, [{ ...row(), status: 'failed', commerceReviewHold: true, commerceResolutionConflict: true }])
  const result = await createPendingEndpoint(async () => customerID).handler(f.req)
  assert.equal(result.status, 200)
  const data = await result.json()
  assert.equal(data.attempts.length, 1)
  assert.equal(data.attempts[0].resolutionConflict, true)
})

test('anonymous and mismatched canonical users cannot read the ledger', async () => {
  for (const canonical of [null, otherID]) {
    const f = fixture()
    const result = await createPendingEndpoint(async () => canonical).handler(f.req)
    assert.equal(result.status, 403)
    assert.equal(f.finds(), 0)
    assert.equal(JSON.stringify(await result.json()).includes('private'), false)
  }
})

test('unknown, duplicate, malformed and foreign lookup query input never reaches storage', async () => {
  for (const query of ['customerID=' + otherID, 'paymentID=abc', 'productID=bad', 'productID=',
    `productID=${productID}&productID=${productID}`, `productID=${productID}&secret=leak`]) {
    const f = fixture('http://localhost:3000/api/payments/portone/pending?' + query)
    assert.equal((await createPendingEndpoint(async () => customerID).handler(f.req)).status, 400)
    assert.equal(f.finds(), 0)
  }
})
